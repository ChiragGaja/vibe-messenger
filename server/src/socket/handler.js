const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { extractUrls, scrapeMetadata } = require('../utils/scraper');
const webpush = require('web-push');

webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

const setupSocket = (io) => {
    // ─── AUTH MIDDLEWARE ─────────────────────────────────────
    io.use((socket, next) => {
        try {
            const cookieStr = socket.handshake.headers.cookie;
            console.log("Socket Auth Cookie:", cookieStr);
            if (!cookieStr) return next(new Error('Authentication required (No cookies).'));
            const tokenMatch = cookieStr.match(/accessToken=([^;]+)/);
            const token = tokenMatch ? tokenMatch[1] : null;
            if (!token) return next(new Error('Authentication required (No token in cookies).'));
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            console.log(`Socket Auth Success for user: ${socket.username}`);
            next();
        } catch (err) {
            console.error("Socket Auth Error:", err.message);
            next(new Error('Invalid token.'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        const username = socket.username;

        console.log(`🟢 ${username} connected (socket: ${socket.id})`);

        socket.join(`user:${userId}`);

        const groupRes = await pool.query('SELECT group_id FROM group_members WHERE user_id = $1', [userId]);
        groupRes.rows.forEach(row => socket.join(`group_${row.group_id}`));

        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);
        await notifyFriendsOfPresence(io, userId, 'user_online');

        // ─── SEND MESSAGE ─────────────────────────────────────
        socket.on('send_message', async (data, callback) => {
            try {
                const { recipientUsername, groupId, content, messageType = 'text', fileUrl, fileName, fileSize, fileUrls, fileNames, fileSizes, replyToId, isHD = false } = data;

                let recipientId = null;
                if (recipientUsername) {
                    const recipientResult = await pool.query('SELECT id FROM users WHERE username = $1', [recipientUsername]);
                    if (recipientResult.rows.length === 0) return callback?.({ error: 'User not found.' });
                    recipientId = recipientResult.rows[0].id;
                } else if (!groupId) {
                    return callback?.({ error: 'Recipient or Group required.' });
                }

                // Fallback to empty array if single file is sent for backwards compatibility
                const urls = fileUrls || (fileUrl ? [fileUrl] : []);
                const names = fileNames || (fileName ? [fileName] : []);
                const sizes = fileSizes || (fileSize ? [fileSize] : []);

                // Link Scraping
                let linkTitle = null, linkDescription = null, linkImage = null, linkUrl = null;
                if (content && messageType === 'text') {
                    const extractedUrls = extractUrls(content);
                    if (extractedUrls.length > 0) {
                        const metadata = await scrapeMetadata(extractedUrls[0]); // Scrape first URL
                        if (metadata) {
                            linkTitle = metadata.title;
                            linkDescription = metadata.description;
                            linkImage = metadata.image;
                            linkUrl = metadata.url;
                        }
                    }
                }

                const status = groupId ? 'sent' : (onlineUsers.has(recipientId) ? 'delivered' : 'sent');
                const encryptedContent = content ? encrypt(content) : null;
                const msgResult = await pool.query(
                    `INSERT INTO messages (sender_id, recipient_id, group_id, content, message_type, file_url, file_name, file_size, file_urls, file_names, file_sizes, status, reply_to_id, link_title, link_description, link_image, link_url, is_hd)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                     RETURNING id, content, message_type, file_url, file_name, file_size, file_urls, file_names, file_sizes, status, created_at, reply_to_id, link_title, link_description, link_image, link_url, is_hd`,
                    [userId, recipientId, groupId || null, encryptedContent, messageType, fileUrl || null, fileName || null, fileSize || null, urls, names, sizes,
                        status, replyToId || null, linkTitle, linkDescription, linkImage, linkUrl, isHD]
                );

                // Fetch reply context if exists
                let replyTo = null;
                if (replyToId) {
                    const replyResult = await pool.query(
                        `SELECT m.id, m.content, m.message_type, u.username AS sender_username
                         FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`, [replyToId]
                    );
                    if (replyResult.rows.length > 0) {
                        replyTo = { ...replyResult.rows[0], content: decrypt(replyResult.rows[0].content) };
                    }
                }

                const message = {
                    id: msgResult.rows[0].id,
                    senderUsername: username,
                    recipientUsername,
                    content: decrypt(msgResult.rows[0].content),
                    messageType: msgResult.rows[0].message_type,
                    fileUrl: msgResult.rows[0].file_url,
                    fileName: msgResult.rows[0].file_name,
                    fileSize: msgResult.rows[0].file_size,
                    fileUrls: msgResult.rows[0].file_urls,
                    fileNames: msgResult.rows[0].file_names,
                    fileSizes: msgResult.rows[0].file_sizes,
                    linkTitle: msgResult.rows[0].link_title,
                    linkDescription: msgResult.rows[0].link_description,
                    linkImage: msgResult.rows[0].link_image,
                    linkUrl: msgResult.rows[0].link_url,
                    status: msgResult.rows[0].status,
                    createdAt: msgResult.rows[0].created_at,
                    isHD: msgResult.rows[0].is_hd,
                    replyTo,
                    reactions: [],
                };

                if (groupId) {
                    socket.to(`group_${groupId}`).emit('new_message', message);
                    // For groups, we could query all members and check online status, but let's stick to DMs for push first to avoid spam.
                } else {
                    io.to(`user:${recipientId}`).emit('new_message', message);

                    // Send Push Notification if recipient is offline
                    if (!onlineUsers.has(recipientId)) {
                        try {
                            const pushResult = await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [recipientId]);
                            const payload = JSON.stringify({
                                title: `New message from ${username}`,
                                body: message.messageType === 'text' ? message.content : `Sent you a ${message.messageType}`,
                                icon: '/vibe-icon.png',
                                url: `/chat`
                            });

                            for (let sub of pushResult.rows) {
                                const pushSubscription = {
                                    endpoint: sub.endpoint,
                                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                                };
                                await webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
                                    if (err.statusCode === 404 || err.statusCode === 410) {
                                        // Subscription has expired or is no longer valid
                                        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
                                    }
                                });
                            }
                        } catch (err) {
                            console.error('Push notification failed:', err);
                        }
                    }
                }
                callback?.({ success: true, message });
            } catch (error) {
                console.error('send_message error:', error);
                callback?.({ error: 'Failed to send message.' });
            }
        });

        // ─── EDIT MESSAGE ─────────────────────────────────────
        socket.on('edit_message', async (data, callback) => {
            try {
                const { messageId, newContent } = data;
                const encryptedContent = encrypt(newContent);
                const result = await pool.query(
                    `UPDATE messages SET content = $1, is_edited = true
                     WHERE id = $2 AND sender_id = $3 AND is_deleted = false
                     RETURNING id, content, is_edited`,
                    [encryptedContent, messageId, userId]
                );

                if (result.rows.length === 0) return callback?.({ error: 'Message not found or unauthorized.' });

                // Notify the other party
                const msgInfo = await pool.query('SELECT recipient_id, sender_id FROM messages WHERE id = $1', [messageId]);
                const otherId = msgInfo.rows[0].recipient_id === userId ? msgInfo.rows[0].sender_id : msgInfo.rows[0].recipient_id;

                io.to(`user:${otherId}`).emit('message_edited', {
                    messageId,
                    newContent,
                    isEdited: true,
                });
                callback?.({ success: true });
            } catch (error) {
                console.error('edit_message error:', error);
                callback?.({ error: 'Failed to edit message.' });
            }
        });

        // ─── DELETE MESSAGE ───────────────────────────────────
        socket.on('delete_message', async (data, callback) => {
            try {
                const { messageId } = data;
                const result = await pool.query(
                    `UPDATE messages SET is_deleted = true, content = NULL, file_url = NULL
                     WHERE id = $1 AND sender_id = $2
                     RETURNING id`,
                    [messageId, userId]
                );

                if (result.rows.length === 0) return callback?.({ error: 'Message not found or unauthorized.' });

                const msgInfo = await pool.query('SELECT recipient_id, sender_id FROM messages WHERE id = $1', [messageId]);
                const otherId = msgInfo.rows[0].recipient_id === userId ? msgInfo.rows[0].sender_id : msgInfo.rows[0].recipient_id;

                io.to(`user:${otherId}`).emit('message_deleted', { messageId });
                callback?.({ success: true });
            } catch (error) {
                console.error('delete_message error:', error);
                callback?.({ error: 'Failed to delete message.' });
            }
        });

        // ─── ADD REACTION ─────────────────────────────────────
        socket.on('add_reaction', async (data, callback) => {
            try {
                const { messageId, emoji } = data;
                await pool.query(
                    `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
                     ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
                    [messageId, userId, emoji]
                );

                // Fetch all reactions for this message
                const reactions = await getReactionsForMessage(messageId);

                // Notify both parties
                const msgInfo = await pool.query('SELECT sender_id, recipient_id FROM messages WHERE id = $1', [messageId]);
                if (msgInfo.rows.length > 0) {
                    const { sender_id, recipient_id } = msgInfo.rows[0];
                    io.to(`user:${sender_id}`).to(`user:${recipient_id}`).emit('reaction_updated', { messageId, reactions });
                }
                callback?.({ success: true, reactions });
            } catch (error) {
                console.error('add_reaction error:', error);
                callback?.({ error: 'Failed to add reaction.' });
            }
        });

        // ─── REMOVE REACTION ──────────────────────────────────
        socket.on('remove_reaction', async (data, callback) => {
            try {
                const { messageId, emoji } = data;
                await pool.query(
                    'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
                    [messageId, userId, emoji]
                );

                const reactions = await getReactionsForMessage(messageId);

                const msgInfo = await pool.query('SELECT sender_id, recipient_id FROM messages WHERE id = $1', [messageId]);
                if (msgInfo.rows.length > 0) {
                    const { sender_id, recipient_id } = msgInfo.rows[0];
                    io.to(`user:${sender_id}`).to(`user:${recipient_id}`).emit('reaction_updated', { messageId, reactions });
                }
                callback?.({ success: true, reactions });
            } catch (error) {
                console.error('remove_reaction error:', error);
                callback?.({ error: 'Failed to remove reaction.' });
            }
        });

        // ─── FORWARD MESSAGE ──────────────────────────────────
        socket.on('forward_message', async (data, callback) => {
            try {
                const { messageId, recipientUsernames, comment } = data;

                // Get original message
                const origMsg = await pool.query(
                    `SELECT m.content, m.message_type, m.file_url, m.file_name, m.file_size, u.username AS original_sender
                     FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
                    [messageId]
                );

                if (origMsg.rows.length === 0) return callback?.({ error: 'Message not found.' });
                const orig = origMsg.rows[0];
                const decryptedOrigContent = decrypt(orig.content);

                const results = [];
                for (const recipientUsername of recipientUsernames) {
                    const recipientResult = await pool.query('SELECT id FROM users WHERE username = $1', [recipientUsername]);
                    if (recipientResult.rows.length === 0) continue;
                    const recipientId = recipientResult.rows[0].id;

                    const fwdResult = await pool.query(
                        `INSERT INTO messages (sender_id, recipient_id, content, message_type, file_url, file_name, file_size, status, is_forwarded, original_sender)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
                         RETURNING id, content, message_type, file_url, file_name, file_size, status, created_at, is_forwarded, original_sender`,
                        [userId, recipientId, encrypt(comment || decryptedOrigContent), orig.message_type, orig.file_url, orig.file_name, orig.file_size,
                            onlineUsers.has(recipientId) ? 'delivered' : 'sent', orig.original_sender]
                    );

                    const message = {
                        id: fwdResult.rows[0].id,
                        senderUsername: username,
                        recipientUsername,
                        content: decrypt(fwdResult.rows[0].content),
                        messageType: fwdResult.rows[0].message_type,
                        fileUrl: fwdResult.rows[0].file_url,
                        fileName: fwdResult.rows[0].file_name,
                        fileSize: fwdResult.rows[0].file_size,
                        status: fwdResult.rows[0].status,
                        createdAt: fwdResult.rows[0].created_at,
                        isForwarded: true,
                        originalSender: fwdResult.rows[0].original_sender,
                        reactions: [],
                    };

                    io.to(`user:${recipientId}`).emit('new_message', message);
                    results.push(message);
                }
                callback?.({ success: true, forwarded: results.length });
            } catch (error) {
                console.error('forward_message error:', error);
                callback?.({ error: 'Failed to forward message.' });
            }
        });

        // ─── TYPING INDICATORS ────────────────────────────────
        socket.on('typing', async (data) => {
            const { recipientUsername } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [recipientUsername]);
            if (r.rows.length > 0) io.to(`user:${r.rows[0].id}`).emit('typing', { username });
        });

        socket.on('stop_typing', async (data) => {
            const { recipientUsername } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [recipientUsername]);
            if (r.rows.length > 0) io.to(`user:${r.rows[0].id}`).emit('stop_typing', { username });
        });

        // ─── MESSAGE READ ─────────────────────────────────────
        socket.on('message_read', async (data) => {
            try {
                const { messageIds, senderUsername } = data;
                if (!messageIds?.length) return;
                await pool.query(
                    `UPDATE messages SET status = 'read' WHERE id = ANY($1) AND recipient_id = $2 AND status != 'read'`,
                    [messageIds, userId]
                );
                const senderResult = await pool.query('SELECT id FROM users WHERE username = $1', [senderUsername]);
                if (senderResult.rows.length > 0) {
                    io.to(`user:${senderResult.rows[0].id}`).emit('messages_read', { messageIds, readerUsername: username });
                }
            } catch (error) {
                console.error('message_read error:', error);
            }
        });

        // ─── FRIEND REQUESTS ──────────────────────────────────

        socket.on('friend_request_responded', async (data) => {
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [data.senderUsername]);
            if (r.rows.length > 0) {
                // Emit to the person who originally sent the request
                io.to(`user:${r.rows[0].id}`).emit('friend_request_accepted', { friendUsername: username, action: data.action });
            }
            // Emit to the person who just accepted the request so their client reloads the friends list
            socket.emit('friend_request_accepted', { friendUsername: data.senderUsername, action: data.action });
        });

        // ─── WEBRTC CALLING ───────────────────────────────────
        socket.on('call_user', async (data) => {
            const { userToCall, signalData, callerName, callerAvatar, isVideo } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [userToCall]);
            if (r.rows.length > 0) {
                io.to(`user:${r.rows[0].id}`).emit('call_incoming', {
                    signal: signalData,
                    callerUsername: username,
                    callerName: callerName,
                    callerAvatar: callerAvatar,
                    isVideo: isVideo
                });
            }
        });

        socket.on('call_accepted', async (data) => {
            const { callerUsername, signal } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [callerUsername]);
            if (r.rows.length > 0) {
                io.to(`user:${r.rows[0].id}`).emit('call_answered', { signal });
            }
        });

        socket.on('call_rejected', async (data) => {
            const { callerUsername } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [callerUsername]);
            if (r.rows.length > 0) {
                io.to(`user:${r.rows[0].id}`).emit('call_declined');
            }
        });

        socket.on('end_call', async (data) => {
            const { toUsername } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [toUsername]);
            if (r.rows.length > 0) {
                io.to(`user:${r.rows[0].id}`).emit('call_ended');
            }
        });

        socket.on('ice_candidate', async (data) => {
            const { toUsername, candidate } = data;
            const r = await pool.query('SELECT id FROM users WHERE username = $1', [toUsername]);
            if (r.rows.length > 0) {
                io.to(`user:${r.rows[0].id}`).emit('ice_candidate_received', { candidate });
            }
        });

        // ─── DISCONNECT ───────────────────────────────────────
        socket.on('disconnect', async () => {
            console.log(`🔴 ${username} disconnected (socket: ${socket.id})`);
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
                    await notifyFriendsOfPresence(io, userId, 'user_offline');
                }
            }
        });
    });
};

// ─── HELPERS ──────────────────────────────────────────────
async function notifyFriendsOfPresence(io, userId, event) {
    try {
        const friendsResult = await pool.query('SELECT friend_id FROM friendships WHERE user_id = $1', [userId]);
        const usernameResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = usernameResult.rows[0]?.username;
        for (const row of friendsResult.rows) {
            io.to(`user:${row.friend_id}`).emit(event, { username });
        }
    } catch (error) {
        console.error('Presence notification error:', error);
    }
}

async function getReactionsForMessage(messageId) {
    const result = await pool.query(
        `SELECT mr.emoji, mr.user_id, u.username
         FROM message_reactions mr JOIN users u ON u.id = mr.user_id
         WHERE mr.message_id = $1 ORDER BY mr.created_at`,
        [messageId]
    );
    // Group: { emoji: '❤️', users: ['alice', 'bob'] }
    const grouped = {};
    for (const row of result.rows) {
        if (!grouped[row.emoji]) grouped[row.emoji] = { emoji: row.emoji, users: [] };
        grouped[row.emoji].users.push(row.username);
    }
    return Object.values(grouped);
}

module.exports = { setupSocket, onlineUsers };

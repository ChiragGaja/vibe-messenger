const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(auth);

// ─── UPLOAD FILE ────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        let messageType = 'document';
        if (req.file.mimetype?.startsWith('image/')) messageType = 'image';
        else if (req.file.mimetype?.startsWith('video/')) messageType = 'video';
        else if (req.file.mimetype?.startsWith('audio/')) messageType = 'audio';

        res.json({
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            messageType,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed.' });
    }
});

// ─── UPLOAD MULTIPLE FILES ──────────────────────────────
router.post('/uploads', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const fileUrls = req.files.map(f => f.path);
        const fileNames = req.files.map(f => f.originalname);
        const fileSizes = req.files.map(f => f.size);

        res.json({
            fileUrls,
            fileNames,
            fileSizes,
        });
    } catch (error) {
        console.error('Multi-upload error:', error);
        res.status(500).json({ error: 'Multi-upload failed.' });
    }
});

// ─── GET STARRED MESSAGES ───────────────────────────────
router.get('/starred/list', async (req, res) => {
    try {
        const userId = req.userId;

        const query = `
            SELECT m.id, m.content, m.message_type, m.file_url, m.file_name, m.file_size, m.file_urls, m.file_names, m.file_sizes,
                   m.link_title, m.link_description, m.link_image, m.link_url,
                   m.status, m.created_at, m.reply_to_id, m.is_edited, m.is_deleted, m.is_forwarded, m.original_sender,
                   sender.username AS sender_username,
                   recipient.username AS recipient_username,
                   s.created_at AS starred_at
            FROM starred_messages s
            JOIN messages m ON m.id = s.message_id
            JOIN users sender ON sender.id = m.sender_id
            JOIN users recipient ON recipient.id = m.recipient_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get starred messages error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET GROUP CONVERSATION HISTORY ───────────────────────
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 50;
        const before = parseInt(req.query.before) || null;

        // Verify membership
        const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Not a member of this group.' });

        let query, params;
        const baseSelect = `
            SELECT m.id, m.content, m.message_type, m.file_url, m.file_name, m.file_size, m.file_urls, m.file_names, m.file_sizes,
                   m.link_title, m.link_description, m.link_image, m.link_url,
                   m.status, m.created_at, m.reply_to_id, m.is_edited, m.is_deleted, m.is_forwarded, m.original_sender,
                   m.group_id,
                   sender.username AS sender_username, sender.display_name AS sender_display_name, sender.avatar_url AS sender_avatar_url,
                   -- Reply context
                   reply.content AS reply_content,
                   reply.message_type AS reply_message_type,
                   reply_sender.username AS reply_sender_username
            FROM messages m
            JOIN users sender ON sender.id = m.sender_id
            LEFT JOIN messages reply ON reply.id = m.reply_to_id
            LEFT JOIN users reply_sender ON reply_sender.id = reply.sender_id`;

        if (before) {
            query = `${baseSelect} WHERE m.group_id = $1 AND m.id < $2 ORDER BY m.created_at DESC LIMIT $3`;
            params = [groupId, before, limit];
        } else {
            query = `${baseSelect} WHERE m.group_id = $1 ORDER BY m.created_at DESC LIMIT $2`;
            params = [groupId, limit];
        }

        const result = await pool.query(query, params);
        const messages = result.rows.reverse();

        // Fetch Reactions & Starred Status
        const messageIds = messages.map(m => m.id);
        let reactionsMap = {};
        let starredSet = new Set();

        if (messageIds.length > 0) {
            const reactionsResult = await pool.query(
                `SELECT mr.message_id, mr.emoji, u.username
                 FROM message_reactions mr JOIN users u ON u.id = mr.user_id
                 WHERE mr.message_id = ANY($1) ORDER BY mr.created_at`, [messageIds]
            );
            for (const row of reactionsResult.rows) {
                if (!reactionsMap[row.message_id]) reactionsMap[row.message_id] = {};
                if (!reactionsMap[row.message_id][row.emoji]) reactionsMap[row.message_id][row.emoji] = { emoji: row.emoji, users: [] };
                reactionsMap[row.message_id][row.emoji].users.push(row.username);
            }

            const starredResult = await pool.query(
                `SELECT message_id FROM starred_messages WHERE user_id = $1 AND message_id = ANY($2)`,
                [userId, messageIds]
            );
            starredResult.rows.forEach(row => starredSet.add(row.message_id));
        }

        const enrichedMessages = messages.map((m) => ({
            ...m,
            linkTitle: m.link_title, linkDescription: m.link_description, linkImage: m.link_image, linkUrl: m.link_url,
            isStarred: starredSet.has(m.id),
            reactions: reactionsMap[m.id] ? Object.values(reactionsMap[m.id]) : [],
            replyTo: m.reply_to_id ? { id: m.reply_to_id, content: m.reply_content, message_type: m.reply_message_type, sender_username: m.reply_sender_username } : null,
        }));

        res.json({ messages: enrichedMessages, hasMore: result.rows.length === limit });
    } catch (err) {
        console.error('Group messages error:', err);
        res.status(500).json({ error: 'Server error retrieving group messages.' });
    }
});

// ─── SEARCH MESSAGES ────────────────────────────────────
router.get('/search', async (req, res) => {
    try {
        const userId = req.userId;
        const { q, friendUsername, groupId } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
        }

        const searchTerm = `%${q.trim()}%`;
        let query, params;

        if (groupId) {
            // Search within group chat
            const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
            if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Not a member of this group.' });

            query = `
                SELECT m.id, m.content, m.message_type, m.created_at,
                       sender.username AS sender_username,
                       sender.avatar_url AS sender_avatar_url
                FROM messages m
                JOIN users sender ON sender.id = m.sender_id
                WHERE m.group_id = $1 AND m.content ILIKE $2
                  AND COALESCE(m.is_deleted, false) = false AND m.message_type = 'text'
                ORDER BY m.created_at DESC
                LIMIT 50
            `;
            params = [groupId, searchTerm];
        } else if (friendUsername) {
            // Search within DM chat
            const friendResult = await pool.query('SELECT id FROM users WHERE username = $1', [friendUsername]);
            if (friendResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
            const friendId = friendResult.rows[0].id;

            query = `
                SELECT m.id, m.content, m.message_type, m.created_at,
                       sender.username AS sender_username,
                       sender.avatar_url AS sender_avatar_url
                FROM messages m
                JOIN users sender ON sender.id = m.sender_id
                WHERE ((m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1))
                  AND m.content ILIKE $3
                  AND COALESCE(m.is_deleted, false) = false AND m.message_type = 'text'
                ORDER BY m.created_at DESC
                LIMIT 50
            `;
            params = [userId, friendId, searchTerm];
        } else {
            return res.status(400).json({ error: 'Provide friendUsername or groupId.' });
        }

        const result = await pool.query(query, params);
        res.json({ results: result.rows });
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET CONVERSATION HISTORY (One on One) ───────────────
router.get('/:friendUsername', async (req, res) => {
    try {
        const { friendUsername } = req.params;
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 50;
        const before = parseInt(req.query.before) || null;

        const friendResult = await pool.query('SELECT id FROM users WHERE username = $1', [friendUsername]);
        if (friendResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        const friendId = friendResult.rows[0].id;

        const friendshipCheck = await pool.query('SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2', [userId, friendId]);
        if (friendshipCheck.rows.length === 0) return res.status(403).json({ error: 'You are not friends with this user.' });

        let query, params;
        const baseSelect = `
            SELECT m.id, m.content, m.message_type, m.file_url, m.file_name, m.file_size, m.file_urls, m.file_names, m.file_sizes,
                   m.link_title, m.link_description, m.link_image, m.link_url,
                   m.status, m.created_at, m.reply_to_id, m.is_edited, m.is_deleted, m.is_forwarded, m.original_sender,
                   sender.username AS sender_username,
                   recipient.username AS recipient_username,
                   -- Reply context
                   reply.content AS reply_content,
                   reply.message_type AS reply_message_type,
                   reply_sender.username AS reply_sender_username
            FROM messages m
            JOIN users sender ON sender.id = m.sender_id
            JOIN users recipient ON recipient.id = m.recipient_id
            LEFT JOIN messages reply ON reply.id = m.reply_to_id
            LEFT JOIN users reply_sender ON reply_sender.id = reply.sender_id`;

        if (before) {
            query = `${baseSelect}
                WHERE ((m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1))
                  AND m.id < $3
                ORDER BY m.created_at DESC LIMIT $4`;
            params = [userId, friendId, before, limit];
        } else {
            query = `${baseSelect}
                WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
                ORDER BY m.created_at DESC LIMIT $3`;
            params = [userId, friendId, limit];
        }

        const result = await pool.query(query, params);
        const messages = result.rows.reverse();

        // Fetch reactions for all messages
        const messageIds = messages.map((m) => m.id);
        let reactionsMap = {};
        let starredSet = new Set();

        if (messageIds.length > 0) {
            const reactionsResult = await pool.query(
                `SELECT mr.message_id, mr.emoji, u.username
                 FROM message_reactions mr JOIN users u ON u.id = mr.user_id
                 WHERE mr.message_id = ANY($1) ORDER BY mr.created_at`,
                [messageIds]
            );
            for (const row of reactionsResult.rows) {
                if (!reactionsMap[row.message_id]) reactionsMap[row.message_id] = {};
                if (!reactionsMap[row.message_id][row.emoji]) reactionsMap[row.message_id][row.emoji] = { emoji: row.emoji, users: [] };
                reactionsMap[row.message_id][row.emoji].users.push(row.username);
            }

            // Fetch starred status for these messages
            const starredResult = await pool.query(
                `SELECT message_id FROM starred_messages WHERE user_id = $1 AND message_id = ANY($2)`,
                [userId, messageIds]
            );
            starredResult.rows.forEach(row => starredSet.add(row.message_id));
        }

        // Enrich messages with reactions and reply context
        const enrichedMessages = messages.map((m) => ({
            ...m,
            linkTitle: m.link_title,
            linkDescription: m.link_description,
            linkImage: m.link_image,
            linkUrl: m.link_url,
            isStarred: starredSet.has(m.id),
            reactions: reactionsMap[m.id] ? Object.values(reactionsMap[m.id]) : [],
            replyTo: m.reply_to_id ? {
                id: m.reply_to_id,
                content: m.reply_content,
                message_type: m.reply_message_type,
                sender_username: m.reply_sender_username,
            } : null,
        }));

        res.json({ messages: enrichedMessages, hasMore: result.rows.length === limit });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── TOGGLE STAR MESSAGE ────────────────────────────────
router.post('/:id/star', async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.userId;

        // Check if message exists and user is allowed to see it
        const msgCheck = await pool.query(
            'SELECT id FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
            [messageId, userId]
        );
        if (msgCheck.rows.length === 0) return res.status(404).json({ error: 'Message not found or access denied.' });

        // Toggle star status
        const starCheck = await pool.query(
            'SELECT id FROM starred_messages WHERE user_id = $1 AND message_id = $2',
            [userId, messageId]
        );

        if (starCheck.rows.length > 0) {
            await pool.query('DELETE FROM starred_messages WHERE id = $1', [starCheck.rows[0].id]);
            res.json({ isStarred: false });
        } else {
            await pool.query(
                'INSERT INTO starred_messages (user_id, message_id) VALUES ($1, $2)',
                [userId, messageId]
            );
            res.json({ isStarred: true });
        }
    } catch (error) {
        console.error('Toggle star error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;

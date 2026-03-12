const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// All friend routes require authentication
router.use(auth);

// ─── SEND FRIEND REQUEST ────────────────────────────────
router.post(
    '/request',
    [
        body('targetUsername')
            .trim()
            .notEmpty()
            .withMessage('Target username is required.'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { targetUsername } = req.body;
            const senderId = req.userId;

            // Can't friend yourself
            if (targetUsername === req.username) {
                return res.status(400).json({ error: "You can't send a friend request to yourself." });
            }

            // Find target user
            const targetResult = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [targetUsername]
            );

            if (targetResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const recipientId = targetResult.rows[0].id;

            // Check if already friends
            const friendCheck = await pool.query(
                'SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2',
                [senderId, recipientId]
            );

            if (friendCheck.rows.length > 0) {
                return res.status(400).json({ error: 'You are already friends with this user.' });
            }

            // Check for existing pending request (either direction)
            const requestCheck = await pool.query(
                `SELECT id, sender_id, status FROM friend_requests
         WHERE ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
         AND status = 'pending'`,
                [senderId, recipientId]
            );

            if (requestCheck.rows.length > 0) {
                return res.status(400).json({ error: 'A friend request is already pending.' });
            }

            // Create friend request
            const result = await pool.query(
                'INSERT INTO friend_requests (sender_id, recipient_id) VALUES ($1, $2) RETURNING id, created_at',
                [senderId, recipientId]
            );

            const io = req.app.get('io');
            if (io) {
                io.to(`user:${recipientId}`).emit('friend_request_received', {
                    id: result.rows[0].id,
                    senderUsername: req.username,
                    senderId: senderId,
                    createdAt: result.rows[0].created_at,
                });
            }

            res.status(201).json({
                message: 'Friend request sent.',
                request: {
                    id: result.rows[0].id,
                    recipientUsername: targetUsername,
                    createdAt: result.rows[0].created_at,
                },
            });
        } catch (error) {
            console.error('Send friend request error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

// ─── ACCEPT / REJECT FRIEND REQUEST ─────────────────────
router.put(
    '/request/:requestId',
    [
        body('action')
            .isIn(['accept', 'reject'])
            .withMessage('Action must be "accept" or "reject".'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { requestId } = req.params;
            const { action } = req.body;
            const userId = req.userId;

            // Find the request (user must be the recipient)
            const requestResult = await pool.query(
                `SELECT id, sender_id, recipient_id, status FROM friend_requests
         WHERE id = $1 AND recipient_id = $2 AND status = 'pending'`,
                [requestId, userId]
            );

            if (requestResult.rows.length === 0) {
                return res.status(404).json({ error: 'Friend request not found or already handled.' });
            }

            const friendRequest = requestResult.rows[0];

            if (action === 'accept') {
                // Begin transaction: update request + create bidirectional friendship
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    await client.query(
                        "UPDATE friend_requests SET status = 'accepted' WHERE id = $1",
                        [requestId]
                    );

                    // Insert bidirectional friendships
                    await client.query(
                        'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING',
                        [friendRequest.sender_id, friendRequest.recipient_id]
                    );

                    await client.query('COMMIT');
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }

                res.json({ message: 'Friend request accepted.' });
            } else {
                // Reject
                await pool.query(
                    "UPDATE friend_requests SET status = 'rejected' WHERE id = $1",
                    [requestId]
                );

                res.json({ message: 'Friend request rejected.' });
            }
        } catch (error) {
            console.error('Accept/Reject friend request error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

// ─── LIST INCOMING FRIEND REQUESTS ──────────────────────
router.get('/requests', async (req, res) => {
    try {
        const userId = req.userId;

        const result = await pool.query(
            `SELECT fr.id, fr.created_at, u.username AS sender_username, u.avatar_url AS sender_avatar
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.recipient_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
            [userId]
        );

        res.json({ requests: result.rows });
    } catch (error) {
        console.error('List friend requests error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── LIST FRIENDS ───────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;

        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar_url, u.last_seen, u.display_name,
                f.theme_color,
                lm.content AS last_message_content,
                lm.status AS last_message_status,
                lm.sender_id AS last_message_sender_id,
                lm.created_at AS last_message_time,
                lm.message_type AS last_message_type,
                COALESCE(uc.unread_count, 0)::int AS unread_count
             FROM friendships f
             JOIN users u ON u.id = f.friend_id
             LEFT JOIN LATERAL (
                 SELECT content, status, sender_id, created_at, message_type
                 FROM messages
                 WHERE (sender_id = f.user_id AND recipient_id = u.id)
                    OR (sender_id = u.id AND recipient_id = f.user_id)
                 ORDER BY created_at DESC 
                 LIMIT 1
             ) lm ON true
             LEFT JOIN LATERAL (
                 SELECT COUNT(*)::int AS unread_count
                 FROM messages
                 WHERE sender_id = u.id AND recipient_id = $1
                   AND status = 'delivered'
             ) uc ON true
             WHERE f.user_id = $1
             ORDER BY COALESCE(lm.created_at, u.last_seen) DESC`,
            [userId]
        );

        res.json({ friends: result.rows });
    } catch (error) {
        console.error('List friends error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── UPDATE CHAT THEME ──────────────────────────────────
router.put('/:friendId/theme', async (req, res) => {
    try {
        const { friendId } = req.params;
        const { themeColor } = req.body;
        const userId = req.userId;

        if (!themeColor) return res.status(400).json({ error: 'themeColor is required.' });

        // Update for both users since the relationship is bidirectional and we want a shared theme
        await pool.query(
            `UPDATE friendships SET theme_color = $1 
             WHERE (user_id = $2 AND friend_id = $3) OR (user_id = $3 AND friend_id = $2)`,
            [themeColor, userId, friendId]
        );

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${friendId}`).emit('theme_updated', {
                chatId: userId,
                themeColor,
                isGroup: false
            });
        }

        res.json({ message: 'Theme updated successfully.', themeColor });
    } catch (error) {
        console.error('Update theme error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;

const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// GET /api/status - Get all active statuses from friends
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.userId;
        
        const query = `
            SELECT s.id, s.user_id, s.media_url, s.media_type, s.expires_at, s.created_at,
                   u.username, u.display_name, u.avatar_url,
                   (
                       SELECT json_agg(json_build_object('username', vu.username, 'display_name', vu.display_name, 'avatar_url', vu.avatar_url, 'viewed_at', sv.viewed_at))
                       FROM status_views sv
                       JOIN users vu ON sv.viewer_id = vu.id
                       WHERE sv.status_id = s.id AND s.user_id = $1
                   ) as views
            FROM statuses s
            JOIN users u ON s.user_id = u.id
            WHERE (s.user_id = $1 OR s.user_id IN (
                SELECT friend_id FROM friendships WHERE user_id = $1
            ))
            AND s.expires_at > NOW()
            ORDER BY s.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        
        // Group by user
        const grouped = {};
        result.rows.forEach(row => {
            if (!grouped[row.user_id]) {
                grouped[row.user_id] = {
                    userId: row.user_id,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                    statuses: []
                };
            }
            grouped[row.user_id].statuses.push({
                id: row.id,
                userId: row.user_id,
                ownerUsername: row.username,
                mediaUrl: row.media_url,
                mediaType: row.media_type,
                expiresAt: row.expires_at,
                createdAt: row.created_at,
                views: row.views || []
            });
        });
        
        // Reverse statuses so oldest is first within a user's group
        Object.values(grouped).forEach(group => {
            group.statuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });

        res.status(200).json({ statusGroups: Object.values(grouped) });
    } catch (err) {
        console.error('Get status error:', err);
        res.status(500).json({ error: 'Server error fetching statuses' });
    }
});

// POST /api/status - Create a new status
router.post('/', auth, upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No media file provided' });
        }
        
        const userId = req.userId;
        const mediaUrl = req.file.path;
        const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        // Expiry is 24 hours from now
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const insertQuery = `
            INSERT INTO statuses (user_id, media_url, media_type, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await pool.query(insertQuery, [userId, mediaUrl, mediaType, expiresAt]);
        
        res.status(201).json({ message: 'Status uploaded successfully', status: result.rows[0] });
    } catch (err) {
        console.error('Upload status error:', err);
        res.status(500).json({ error: err.message || 'Failed to upload status' });
    }
});

// POST /api/status/:id/view - Record a status view
router.post('/:id/view', auth, async (req, res) => {
    try {
        const statusId = req.params.id;
        const viewerId = req.userId;
        
        // Don't record if viewing own status
        const statusRes = await pool.query('SELECT user_id FROM statuses WHERE id = $1', [statusId]);
        if (statusRes.rows.length === 0) return res.status(404).json({ error: 'Status not found' });
        if (statusRes.rows[0].user_id === viewerId) return res.status(200).json({ message: 'Ignored' });
        
        await pool.query(
            'INSERT INTO status_views (status_id, viewer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [statusId, viewerId]
        );
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Record status view error:', err);
        res.status(500).json({ error: 'Failed to record view' });
    }
});

module.exports = router;

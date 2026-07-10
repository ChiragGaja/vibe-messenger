const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const webpush = require('web-push');

webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Upsert subscription
        await pool.query(`
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, last_used)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (endpoint) 
            DO UPDATE SET 
                user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                last_used = NOW()
        `, [req.user.userId, endpoint, keys.p256dh, keys.auth]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Unsubscribe
router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Push unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

module.exports = router;

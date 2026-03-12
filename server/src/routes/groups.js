const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// Create a new group
router.post('/create', authenticateToken, async (req, res) => {
    const { name, description, avatar_url, memberIds } = req.body;
    const creatorId = req.userId;

    if (!name || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Group name and at least one member are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert into groups
        const groupRes = await client.query(
            'INSERT INTO groups (name, description, avatar_url, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, avatar_url, creatorId]
        );
        const group = groupRes.rows[0];

        // Prepare member insertions (add creator as admin)
        const allMembers = new Set([creatorId, ...memberIds]);

        for (const userId of allMembers) {
            const role = userId === creatorId ? 'admin' : 'member';
            await client.query(
                'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
                [group.id, userId, role]
            );
        }

        await client.query('COMMIT');

        // Fetch member details to send back (so frontend has avatars/names)
        const membersRes = await pool.query(`
            SELECT u.id, u.username, u.display_name, u.avatar_url, gm.role
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = $1
        `, [group.id]);

        const groupData = { ...group, members: membersRes.rows, is_group: true };

        // Real-time: Notify all members that a group was created
        const io = req.app.get('io');
        if (io) {
            allMembers.forEach(memberId => {
                io.to(`user:${memberId}`).emit('group_added', groupData);
            });
        }

        res.status(201).json({ group: groupData });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Group creation error:', err);
        res.status(500).json({ error: 'Server error while creating group.' });
    } finally {
        client.release();
    }
});

// List all groups for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.userId;
    try {
        const result = await pool.query(`
            SELECT g.id, g.name AS username, g.name AS display_name, g.avatar_url, g.theme_color, g.created_at, gm.role, true AS is_group,
                   (
                       SELECT json_agg(json_build_object(
                           'id', u.id,
                           'username', u.username,
                           'display_name', u.display_name,
                           'avatar_url', u.avatar_url,
                           'role', gm2.role
                       ))
                       FROM group_members gm2
                       JOIN users u ON u.id = gm2.user_id
                       WHERE gm2.group_id = g.id
                   ) as members
            FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
        `, [userId]);

        res.json({ groups: result.rows });
    } catch (err) {
        console.error('List groups error:', err);
        res.status(500).json({ error: 'Server error while fetching groups.' });
    }
});

// ─── ADMIN: CHANGE GROUP NAME ───────────────────────────
router.put('/:id/name', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const groupId = req.params.id;
    const userId = req.userId;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    try {
        const memberCheck = await pool.query('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can change the group name' });
        }

        await pool.query('UPDATE groups SET name = $1 WHERE id = $2', [name.trim(), groupId]);
        res.json({ success: true, name: name.trim() });
    } catch (err) {
        console.error('Change group name error:', err);
        res.status(500).json({ error: 'Server error changing group name' });
    }
});

// ─── ADMIN: KICK MEMBER ─────────────────────────────────
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
    const groupId = req.params.id;
    const targetUserId = req.params.memberId;
    const adminId = req.userId;

    try {
        const adminCheck = await pool.query('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, adminId]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can kick members' });
        }

        if (adminId.toString() === targetUserId.toString()) {
            return res.status(400).json({ error: 'Cannot kick yourself' });
        }

        const result = await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *', [groupId, targetUserId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User is not in the group' });

        res.json({ success: true, message: 'User removed from group' });
    } catch (err) {
        console.error('Kick user error:', err);
        res.status(500).json({ error: 'Server error kicking user' });
    }
});

// ─── UPDATE GROUP THEME ─────────────────────────────────
router.put('/:id/theme', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const { themeColor } = req.body;
        const userId = req.userId;

        if (!themeColor) return res.status(400).json({ error: 'themeColor is required.' });

        // Ensure user is in the group (any member can change the theme config)
        const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Must be a member to change group theme' });
        }

        await pool.query('UPDATE groups SET theme_color = $1 WHERE id = $2', [themeColor, groupId]);

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_${groupId}`).emit('theme_updated', {
                chatId: groupId,
                themeColor,
                isGroup: true
            });
        }

        res.json({ message: 'Group theme updated successfully.', themeColor });
    } catch (error) {
        console.error('Update group theme error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;

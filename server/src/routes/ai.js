const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Initialize Gemini SDK
// It automatically picks up GEMINI_API_KEY from process.env
const ai = new GoogleGenAI({});

router.post('/summarize', async (req, res) => {
    try {
        const userId = req.userId;
        const { targetUserId, groupId, limit = 50 } = req.body;

        if (!targetUserId && !groupId) {
            return res.status(400).json({ error: 'Must provide targetUserId or groupId.' });
        }

        let query, params;
        
        if (groupId) {
            // Check group membership
            const memberCheck = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
            if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Not a member of this group.' });
            
            query = `
                SELECT m.content, u.username, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE m.group_id = $1 AND m.message_type = 'text' AND m.content IS NOT NULL AND m.is_deleted = false
                ORDER BY m.created_at DESC
                LIMIT $2
            `;
            params = [groupId, limit];
        } else {
            // Check friendship status
            const friendshipCheck = await pool.query('SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2', [userId, targetUserId]);
            if (friendshipCheck.rows.length === 0) return res.status(403).json({ error: 'Must be friends to summarize chat.' });

            query = `
                SELECT m.content, u.username, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE ((m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1))
                  AND m.message_type = 'text' AND m.content IS NOT NULL AND m.is_deleted = false
                ORDER BY m.created_at DESC
                LIMIT $3
            `;
            params = [userId, targetUserId, limit];
        }

        const result = await pool.query(query, params);
        const messages = result.rows.reverse();

        if (messages.length === 0) {
            return res.json({ summary: "No text messages found to summarize." });
        }

        // Format messages for the prompt
        const chatTranscript = messages.map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.username}: ${m.content}`).join('\n');

        const prompt = `You are an AI assistant built into a modern chat application.
Your task is to summarize the following chunk of recent chat history.
Keep it strictly under 3 sentences. Be friendly, concise, and helpful. Mention key topics or decisions made.

Chat Transcript:
${chatTranscript}

Summary:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ summary: response.text });

    } catch (error) {
        console.error('AI Summarize Error:', error);
        res.status(500).json({ error: 'Failed to generate chat summary.' });
    }
});

module.exports = router;

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT id, content, sender_id, recipient_id, is_deleted, message_type 
            FROM messages 
            WHERE content ILIKE '%howre u%'
        `);
        console.log("Found:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();

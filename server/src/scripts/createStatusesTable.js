require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('../config/db');

async function createStatusesTable() {
    try {
        console.log('Connecting to database...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS statuses (
              id SERIAL PRIMARY KEY,
              user_id INT REFERENCES users(id) ON DELETE CASCADE,
              media_url TEXT NOT NULL,
              media_type VARCHAR(20) DEFAULT 'image' CHECK (media_type IN ('image','video')),
              expires_at TIMESTAMPTZ NOT NULL,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_statuses_user_expires ON statuses(user_id, expires_at);
        `);

        console.log('✅ Statuses table created successfully.');
    } catch (error) {
        console.error('❌ Failed to create statuses table:', error);
    } finally {
        await pool.end();
    }
}

createStatusesTable();

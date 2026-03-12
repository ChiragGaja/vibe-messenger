require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Running migration...');

        // Add new columns to messages table
        await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INT REFERENCES messages(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false');
        await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_sender VARCHAR(50)");

        // Add new columns to users table
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(160)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status VARCHAR(100)");

        // Create message_reactions table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INT REFERENCES messages(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `);

        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id)');

        console.log('✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();

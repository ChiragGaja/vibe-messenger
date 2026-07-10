require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Starting migration...');
        await pool.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;');
        await pool.query(`ALTER TABLE messages ADD CONSTRAINT messages_message_type_check CHECK (message_type IN ('text','image','video','audio','document','multi'));`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_names VARCHAR(255)[] DEFAULT '{}';`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_sizes INT[] DEFAULT '{}';`);

        // Link Metadata Columns
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS link_title TEXT;`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS link_description TEXT;`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS link_image TEXT;`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS link_url TEXT;`);

        // Starred Messages Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS starred_messages (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                message_id INT REFERENCES messages(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, message_id)
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_messages(user_id);`);

        // Phase 7: Groups Schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS groups (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                avatar_url TEXT,
                created_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS group_members (
                group_id INT REFERENCES groups(id) ON DELETE CASCADE,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member','admin')),
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (group_id, user_id)
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);`);

        // Add group_id to messages
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id INT REFERENCES groups(id) ON DELETE CASCADE;`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);`);

        // Phase 8: Web Push Subscriptions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT UNIQUE NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_used TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);`);

        console.log('Migration successful');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}

migrate();

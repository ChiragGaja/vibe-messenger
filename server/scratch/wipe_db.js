const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function wipeDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('🚮 Starting database wipe...');
    
    // Deleting from users with CASCADE will handle most things, 
    // but we'll explicitly truncate all tables for clarity and to reset sequences.
    const tables = [
      'message_reactions',
      'starred_messages',
      'messages',
      'group_members',
      'groups',
      'friendships',
      'friend_requests',
      'statuses',
      'users'
    ];

    for (const table of tables) {
      console.log(`- Clearing table: ${table}`);
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }
    
    console.log('✅ Database wiped successfully! All users, messages, and groups have been deleted.');
  } catch (err) {
    console.error('❌ Error wiping database:', err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

wipeDatabase();

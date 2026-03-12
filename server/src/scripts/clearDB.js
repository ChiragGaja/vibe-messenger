require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('../config/db');

async function clearDB() {
    try {
        console.log('Connecting to database...');

        // TRUNCATE TABLE users CASCADE will effectively wipe EVERYTHING 
        // because of the ON DELETE CASCADE relationships we set up.
        console.log('Wiping database content...');
        const result = await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');

        console.log('✅ Database successfully truncated. All data wiped.');
    } catch (error) {
        console.error('❌ Failed to truncate database:', error);
    } finally {
        // Close the pool connection to allow script to exit
        await pool.end();
    }
}

clearDB();

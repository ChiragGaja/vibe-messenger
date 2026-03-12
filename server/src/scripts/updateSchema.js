require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function updateSchema() {
    try {
        console.log('Connecting to database...');
        const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        console.log('Applying updated schema...');
        // Since we want to add columns, and we've already wiped data, 
        // we can just drop and recreate for simplicity, or try to run the file.
        // However, CREATE TABLE IF NOT EXISTS won't add columns to existing tables.

        // Let's manually add the columns to be safe without dropping everything again if possible,
        // but since we want a clean slate, dropping is fine.

        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified') THEN
                    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='otp') THEN
                    ALTER TABLE users ADD COLUMN otp VARCHAR(6);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='otp_expires_at') THEN
                    ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMPTZ;
                END IF;
            END $$;
        `);

        console.log('✅ Schema updated successfully with OTP columns.');
    } catch (error) {
        console.error('❌ Failed to update schema:', error);
    } finally {
        await pool.end();
    }
}

updateSchema();

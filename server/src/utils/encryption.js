const crypto = require('crypto');

// Must be 32 bytes (64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
// IV length for AES is usually 16 bytes
const IV_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} text - The plaintext to encrypt.
 * @returns {string|null} The encrypted string in format iv:authTag:encryptedText, or null if input is falsy.
 */
function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (e) {
        console.error('Encryption failed:', e);
        return text;
    }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * @param {string} text - The encrypted string in format iv:authTag:encryptedText.
 * @returns {string|null} The decrypted plaintext, or original text if decryption fails.
 */
function decrypt(text) {
    if (!text) return text;
    try {
        const parts = text.split(':');
        if (parts.length !== 3) return text; // Not an encrypted string
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = Buffer.from(parts[2], 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        // Return placeholder or original text if decryption fails (e.g., legacy plaintext messages)
        return text;
    }
}

module.exports = {
    encrypt,
    decrypt
};

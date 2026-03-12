/**
 * Shared Validation Rules & Utilities
 * Used by both registration and login routes for consistent validation.
 */

// ─── Reserved Usernames ─────────────────────────────────
// These cannot be registered to prevent impersonation / confusion
const RESERVED_USERNAMES = [
    'admin', 'administrator', 'root', 'support', 'system',
    'moderator', 'mod', 'help', 'test', 'bot', 'vibe',
    'null', 'undefined', 'api', 'www', 'mail', 'ftp',
];

// ─── Username Validation ────────────────────────────────
// Rules:
//   - 3–20 characters
//   - Only lowercase letters, numbers, underscores
//   - Must start with a letter
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: 'Username is required' };
    }

    const trimmed = username.trim();

    if (trimmed.length < 3 || trimmed.length > 20) {
        return { valid: false, message: 'Username must be between 3 and 20 characters' };
    }

    if (!/^[a-zA-Z]/.test(trimmed)) {
        return { valid: false, message: 'Username must start with a letter' };
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
        return { valid: false, message: 'Only lowercase letters, numbers, and underscores allowed' };
    }

    if (!USERNAME_REGEX.test(trimmed)) {
        return {
            valid: false,
            message: 'Invalid username format',
        };
    }

    if (RESERVED_USERNAMES.includes(trimmed.toLowerCase())) {
        return { valid: false, message: 'This username is reserved. Please choose another.' };
    }

    return { valid: true, message: null };
}

// ─── Password Validation ────────────────────────────────
// Rules:
//   - Minimum 6 characters
//   - At least one uppercase letter
//   - At least one lowercase letter
//   - At least one number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    const trimmed = password.trim(); // No trimming for passwords usually, but keeping consistency

    if (trimmed.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain uppercase, lowercase and a number' };
    }

    return { valid: true, message: null };
}

// ─── Password Strength Calculator ───────────────────────
// Returns a score from 0–4:
//   0 = Too Weak, 1 = Weak, 2 = Fair, 3 = Strong, 4 = Very Strong
function getPasswordStrength(password) {
    if (!password) return { score: 0, label: 'Too Weak' };

    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Clamp to 0–4
    score = Math.min(4, score);

    const labels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return { score, label: labels[score] };
}

// ─── Email Normalization ────────────────────────────────
// Trim whitespace and convert to lowercase
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

// ─── Input Sanitization ─────────────────────────────────
// Strip HTML tags and trim to prevent XSS
function sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/<[^>]*>/g, '');
}

// ─── Account Lockout Config ─────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

module.exports = {
    RESERVED_USERNAMES,
    validateUsername,
    validatePassword,
    getPasswordStrength,
    normalizeEmail,
    sanitizeInput,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_DURATION_MS,
};

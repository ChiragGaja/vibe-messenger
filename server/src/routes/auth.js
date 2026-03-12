const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendOTP, sendPasswordResetOTP } = require('../utils/mailer');
const { loginLimiter, registerLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
    validateUsername,
    validatePassword,
    normalizeEmail,
    sanitizeInput,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_DURATION_MS,
} = require('../utils/validators');
const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

const router = express.Router();

// ─── REGISTER ───────────────────────────────────────────
router.post(
    '/register',
    registerLimiter, // Rate limit registration attempts
    [
        body('username').trim().escape(),
        body('password').trim(),
        body('email').trim().normalizeEmail(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            let { username, password, email } = req.body;

            // Sanitize inputs
            username = sanitizeInput(username);
            email = normalizeEmail(email);

            // Validate username with advanced rules
            const usernameCheck = validateUsername(username);
            if (!usernameCheck.valid) {
                return res.status(400).json({ error: usernameCheck.message });
            }

            // Validate password strength
            const passwordCheck = validatePassword(password);
            if (!passwordCheck.valid) {
                return res.status(400).json({ error: passwordCheck.message });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                return res.status(400).json({ error: 'Enter a valid email address' });
            }

            // Domain Validation
            const popularDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me', 'live.com'];
            const domain = email.split('@')[1];
            if (!popularDomains.includes(domain)) {
                try {
                    const mxRecords = await resolveMx(domain);
                    if (!mxRecords || mxRecords.length === 0) {
                        return res.status(400).json({ error: 'Email domain is not valid' });
                    }
                } catch (err) {
                    return res.status(400).json({ error: 'Email domain is not valid' });
                }
            }

            // Check if username or email already exists
            const existingUser = await pool.query(
                'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                const existing = existingUser.rows[0];
                if (existing.username.toLowerCase() === username.toLowerCase()) {
                    return res.status(409).json({ error: 'Username already taken' });
                }
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Hash password with bcrypt (12 salt rounds)
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Generate 6-digit OTP for email verification
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

            // Insert user into database
            const result = await pool.query(
                `INSERT INTO users (username, password_hash, email, otp, otp_expires_at, is_verified) 
                 VALUES ($1, $2, $3, $4, $5, FALSE) 
                 RETURNING id, username, email`,
                [username, passwordHash, email, otp, otpExpiresAt]
            );

            // Send OTP email
            await sendOTP(email, otp);

            res.status(201).json({
                message: 'Registration successful. Please verify your email.',
                requiresVerification: true,
                user: {
                    id: result.rows[0].id,
                    username: result.rows[0].username,
                    email: result.rows[0].email,
                },
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

// ─── LOGIN ──────────────────────────────────────────────
router.post(
    '/login',
    loginLimiter, // Rate limit login attempts per IP
    [
        body('username').trim().escape().notEmpty().withMessage('Username is required.'),
        body('password').notEmpty().withMessage('Password is required.'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { username, password } = req.body;

            // Find user by username
            const result = await pool.query(
                'SELECT id, username, email, password_hash, avatar_url, is_verified, failed_login_attempts, locked_until FROM users WHERE username = $1',
                [username]
            );

            if (result.rows.length === 0) {
                // Generic message to prevent username enumeration
                return res.status(401).json({ error: 'Invalid username or password.' });
            }

            const user = result.rows[0];

            // ─── Account Lockout Check ──────────────────────
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                const remainingMs = new Date(user.locked_until) - new Date();
                const remainingMin = Math.ceil(remainingMs / 60000);
                return res.status(423).json({
                    error: `Account temporarily locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
                    lockedUntil: user.locked_until,
                    isLocked: true,
                });
            }

            // ─── Email Verification Check ───────────────────
            if (!user.is_verified) {
                return res.status(403).json({
                    error: 'Please verify your email address before logging in.',
                    requiresVerification: true,
                    email: user.email,
                });
            }

            // ─── Password Verification ──────────────────────
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                // Increment failed attempts
                const newAttempts = (user.failed_login_attempts || 0) + 1;

                if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                    // Lock the account
                    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                    await pool.query(
                        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
                        [newAttempts, lockUntil, user.id]
                    );
                    return res.status(423).json({
                        error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in 15 minutes.`,
                        isLocked: true,
                        lockedUntil: lockUntil,
                    });
                }

                // Just increment the counter
                await pool.query(
                    'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
                    [newAttempts, user.id]
                );

                const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
                return res.status(401).json({
                    error: `Invalid username or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
                    attemptsRemaining: remaining,
                });
            }

            // ─── Successful Login ───────────────────────────
            // Reset failed attempts and update last_seen
            await pool.query(
                'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_seen = NOW() WHERE id = $1',
                [user.id]
            );

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login successful.',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatar_url,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

// ─── VERIFY OTP ───────────────────────────────────────
router.post(
    '/verify-otp',
    otpLimiter,
    [
        body('email').isEmail().withMessage('Invalid email.'),
        body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
    ],
    async (req, res) => {
        try {
            const { email, otp } = req.body;

            const result = await pool.query(
                'SELECT id, username, otp, otp_expires_at FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const user = result.rows[0];

            if (user.otp !== otp) {
                return res.status(400).json({ error: 'Invalid verification code.' });
            }

            if (new Date() > new Date(user.otp_expires_at)) {
                return res.status(400).json({ error: 'Verification code has expired.' });
            }

            // Mark as verified and clear OTP
            await pool.query(
                'UPDATE users SET is_verified = TRUE, otp = NULL, otp_expires_at = NULL WHERE id = $1',
                [user.id]
            );

            // Generate JWT after successful verification
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Verification successful.',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: email,
                },
            });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    }
);

// ─── RESEND OTP ─────────────────────────────────────────
router.post('/resend-otp', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60000);

        const result = await pool.query(
            'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3 RETURNING id',
            [otp, otpExpiresAt, email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await sendOTP(email, otp);
        res.json({ message: 'A new verification code has been sent to your email.' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET CURRENT USER ───────────────────────────────────
router.get('/me', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, avatar_url, display_name, bio, custom_status, created_at FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── UPDATE PROFILE ─────────────────────────────────────
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
    try {
        const { displayName, bio, customStatus } = req.body;
        const userId = req.userId;

        const currentRes = await pool.query('SELECT avatar_url, display_name, bio, custom_status FROM users WHERE id = $1', [userId]);
        if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        const current = currentRes.rows[0];

        const avatarUrl = req.file ? req.file.path : current.avatar_url;
        const newDisplayName = displayName !== undefined ? sanitizeInput(displayName) : current.display_name;
        const newBio = bio !== undefined ? sanitizeInput(bio) : current.bio;
        const newCustomStatus = customStatus !== undefined ? sanitizeInput(customStatus) : current.custom_status;

        const updateRes = await pool.query(
            `UPDATE users 
             SET avatar_url = $1, display_name = $2, bio = $3, custom_status = $4
             WHERE id = $5 
             RETURNING id, username, email, avatar_url, display_name, bio, custom_status, created_at`,
            [avatarUrl, newDisplayName, newBio, newCustomStatus, userId]
        );

        res.json({ message: 'Profile updated successfully', user: updateRes.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET USER PUBLIC PROFILE ────────────────────────────
router.get('/user/:username', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, display_name, avatar_url, bio, custom_status, last_seen, created_at FROM users WHERE username = $1',
            [req.params.username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── FORGOT PASSWORD (Request Reset OTP) ────────────────
router.post('/forgot-password', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists and is verified
        const result = await pool.query(
            'SELECT id, username, is_verified FROM users WHERE LOWER(email) = $1',
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            // Don't reveal whether email exists — always show success
            return res.json({ message: 'If that email is registered, a reset code has been sent.' });
        }

        const user = result.rows[0];
        if (!user.is_verified) {
            return res.status(400).json({ error: 'This account has not been verified yet. Please complete registration first.' });
        }

        // Generate OTP and store it
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

        await pool.query(
            'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE id = $3',
            [otp, otpExpiresAt, user.id]
        );

        // Send password reset email
        await sendPasswordResetOTP(normalizedEmail, otp);

        res.json({ message: 'If that email is registered, a reset code has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── RESET PASSWORD (Verify OTP + Set New Password) ─────
router.post('/reset-password', otpLimiter, async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, code, and new password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Validate new password
        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.valid) {
            return res.status(400).json({ error: passwordCheck.message });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, otp, otp_expires_at FROM users WHERE LOWER(email) = $1',
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or code.' });
        }

        const user = result.rows[0];

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid reset code.' });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
        }

        // Hash new password and update
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE users SET password_hash = $1, otp = NULL, otp_expires_at = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        res.json({ message: 'Password reset successful! You can now sign in with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────
router.delete('/account', auth, async (req, res) => {
    try {
        const userId = req.userId;

        // Optionally, check if they own any groups and transfer ownership or empty the group id,
        // but 'ON DELETE SET NULL' or 'CASCADE' handles the DB constraint logic for us.
        // E.g. created_by in groups has ON DELETE SET NULL.
        
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;

/**
 * Rate Limiting Middleware
 * Prevents brute-force attacks by limiting requests per IP.
 */
const rateLimit = require('express-rate-limit');

// ─── Login Rate Limiter ─────────────────────────────────
// Max 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window
    message: {
        error: 'Too many login attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,      // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: true, // Only count failed requests
});

// ─── Register Rate Limiter ──────────────────────────────
// Max 3 registration attempts per 15 minutes per IP
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many registration attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── OTP Rate Limiter ───────────────────────────────────
// Max 5 OTP requests per 15 minutes per IP
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many OTP requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, registerLimiter, otpLimiter };

/**
 * useFormValidation — Real-time form validation hook
 * Mirrors server-side validation rules for instant client-side feedback.
 */
import { useState, useCallback } from 'react';

// ─── Reserved Usernames (must match server) ─────────────
const RESERVED_USERNAMES = [
    'admin', 'administrator', 'root', 'support', 'system',
    'moderator', 'mod', 'help', 'test', 'bot', 'vibe',
    'null', 'undefined', 'api', 'www', 'mail', 'ftp',
];

// ─── Validation Functions ───────────────────────────────

export function validateUsername(username) {
    if (!username) return { valid: false, message: 'Username is required' };

    const trimmed = username.trim();

    if (trimmed.length < 3) {
        return { valid: false, message: 'Username must be between 3 and 20 characters' };
    }
    if (trimmed.length > 20) {
        return { valid: false, message: 'Username must be between 3 and 20 characters' };
    }

    if (!/^[a-zA-Z]/.test(trimmed)) {
        return { valid: false, message: 'Username must start with a letter' };
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
        return { valid: false, message: 'Only lowercase letters, numbers, and underscores allowed' };
    }

    // Reserved names
    if (RESERVED_USERNAMES.includes(trimmed.toLowerCase())) {
        return { valid: false, message: 'This username is reserved' };
    }

    return { valid: true, message: 'Username looks good!' };
}

export function validateEmail(email) {
    if (!email) return { valid: false, message: 'Email is required' };
    const trimmed = email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(trimmed)) {
        return { valid: false, message: 'Enter a valid email address' };
    }
    return { valid: true, message: 'Valid email' };
}

export function validatePassword(password) {
    if (!password) return { valid: false, message: 'Password is required', checks: {} };

    const checks = {
        minLength: password.length >= 6,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    };

    const allPassed = Object.values(checks).every(Boolean);

    if (!checks.minLength) {
        return { valid: false, message: 'Password must be at least 6 characters', checks };
    }

    if (!allPassed) {
        return { valid: false, message: 'Password must contain uppercase, lowercase and a number', checks };
    }

    return { valid: true, message: 'Strong password!', checks };
}

// ─── Password Strength Calculator ───────────────────────
// Returns score 0–4 with label and color
export function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '', color: 'transparent', percent: 0 };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    score = Math.min(4, score);

    const config = [
        { label: 'Too Weak', color: '#ef4444', percent: 15 },
        { label: 'Weak', color: '#f97316', percent: 35 },
        { label: 'Fair', color: '#eab308', percent: 55 },
        { label: 'Strong', color: '#22c55e', percent: 80 },
        { label: 'Very Strong', color: '#059669', percent: 100 },
    ];

    return { score, ...config[score] };
}

// ─── Hook ───────────────────────────────────────────────
export default function useFormValidation() {
    const [fieldErrors, setFieldErrors] = useState({});
    const [fieldValid, setFieldValid] = useState({});

    const validate = useCallback((field, value) => {
        let result;
        switch (field) {
            case 'username':
                result = validateUsername(value);
                break;
            case 'email':
                result = validateEmail(value);
                break;
            case 'password':
                result = validatePassword(value);
                break;
            default:
                return;
        }

        setFieldErrors((prev) => ({ ...prev, [field]: result.valid ? '' : result.message }));
        setFieldValid((prev) => ({ ...prev, [field]: result.valid }));

        return result;
    }, []);

    const clearErrors = useCallback(() => {
        setFieldErrors({});
        setFieldValid({});
    }, []);

    return { fieldErrors, fieldValid, validate, clearErrors };
}

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, UserPlus, Eye, EyeOff, Check, X as XIcon, Shield } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import useFormValidation, { getPasswordStrength, validatePassword, validateUsername, validateEmail } from '../hooks/useFormValidation';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const setAuth = useChatStore((s) => s.setAuth);
    const { fieldErrors, fieldValid, validate } = useFormValidation();

    // Password strength state
    const [pwStrength, setPwStrength] = useState({ score: 0, label: '', color: 'transparent', percent: 0 });
    const [pwChecks, setPwChecks] = useState({});

    useEffect(() => {
        if (location.state?.email) setEmail(location.state.email);
        if (location.state?.step) setStep(location.state.step);
    }, [location.state]);

    // Real-time validation handlers
    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        if (fieldErrors.username) validate('username', e.target.value);
    };
    const handleUsernameBlur = () => {
        const val = username.trim();
        setUsername(val);
        validate('username', val);
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (fieldErrors.email) validate('email', e.target.value);
    };
    const handleEmailBlur = () => {
        const val = email.trim();
        setEmail(val);
        validate('email', val);
    };

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        setPwStrength(getPasswordStrength(val));
        const result = validatePassword(val);
        setPwChecks(result.checks || {});
        if (fieldErrors.password) validate('password', val);
    };
    const handlePasswordBlur = () => {
        validate('password', password);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate all fields on submit so the user gets feedback even if they never blurred
        if (step === 1) {
            // Run validate to update UI indicators under each field
            validate('username', username.trim());
            validate('email', email.trim());
            validate('password', password);

            // Check directly using validation functions for reliable result
            const uOk = validateUsername(username.trim()).valid;
            const eOk = validateEmail(email.trim()).valid;
            const pOk = validatePassword(password).valid;
            if (!uOk || !eOk || !pOk) {
                setError('Please fix the highlighted fields above.');
                return;
            }
        }

        setLoading(true);
        try {
            if (step === 1) {
                await api.post('/auth/register', { username: username.trim(), password, email: email.trim() });
                setStep(2);
            } else {
                const { data } = await api.post('/auth/verify-otp', { email, otp });
                setAuth(data.user, data.token);
                navigate('/');
            }
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors?.length) {
                setError(errors.map((e) => e.msg).join(' '));
            } else {
                setError(err.response?.data?.error || (step === 1 ? 'Registration failed.' : 'Verification failed.'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        setResending(true);
        try {
            await api.post('/auth/resend-otp', { email });
            setError('New code sent!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend code.');
        } finally {
            setResending(false);
        }
    };

    // Determine if form is valid for submission
    const isStep1Valid = fieldValid.username && fieldValid.email && fieldValid.password;

    // Helper for field border color
    const fieldBorderClass = (field) => {
        if (!fieldErrors[field] && !fieldValid[field]) return 'border-border focus:border-primary-500/50';
        if (fieldValid[field]) return 'border-emerald-500/50 focus:border-emerald-500';
        return 'border-red-500/50 focus:border-red-500';
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
            {/* Minimal Background */}
            <div className="absolute inset-0 -z-10 bg-background" />

            <motion.div
                className="w-full max-w-md mx-4 p-8 sm:p-10 glass-panel rounded-2xl"
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {/* Logo */}
                    <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-surface-active border border-border flex items-center justify-center shadow-lg overflow-hidden">
                            <img src="/vibe-icon.png" alt="Vibe Logo" className="w-full h-full object-cover" />
                        </div>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-3xl font-bold text-center text-text mb-1">
                        {step === 1 ? 'Create Account' : 'Verify Email'}
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-center text-text-muted text-sm mb-8">
                        {step === 1 ? 'Join the conversation' : `Enter the 6-digit code sent to ${email}`}
                    </motion.p>

                    {/* Error / Success message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`${error === 'New code sent!' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} border px-4 py-3 rounded-xl text-sm mb-4`}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit}>
                        {step === 1 ? (
                            <>
                                {/* Username Field */}
                                <motion.div variants={itemVariants} className="mb-4">
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Username</label>
                                    <input
                                        id="reg-username"
                                        type="text"
                                        className={`input-field transition-colors ${fieldBorderClass('username')}`}
                                        placeholder="e.g. john_doe"
                                        value={username}
                                        onChange={handleUsernameChange}
                                        onBlur={handleUsernameBlur}
                                        required
                                        autoFocus
                                        maxLength={20}
                                    />
                                    <AnimatePresence>
                                        {fieldErrors.username && (
                                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                                <XIcon size={12} /> {fieldErrors.username}
                                            </motion.p>
                                        )}
                                        {fieldValid.username && (
                                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                                                <Check size={12} /> Username looks good!
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Email Field */}
                                <motion.div variants={itemVariants} className="mb-4">
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Email Address</label>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        className={`input-field transition-colors ${fieldBorderClass('email')}`}
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={handleEmailChange}
                                        onBlur={handleEmailBlur}
                                        required
                                    />
                                    <AnimatePresence>
                                        {fieldErrors.email && (
                                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                                <XIcon size={12} /> {fieldErrors.email}
                                            </motion.p>
                                        )}
                                        {fieldValid.email && (
                                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                                                <Check size={12} /> Valid email
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Password Field */}
                                <motion.div variants={itemVariants} className="mb-4">
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Password</label>
                                    <div className="relative">
                                        <input
                                            id="reg-password"
                                            type={showPassword ? 'text' : 'password'}
                                            className={`input-field pr-11 transition-colors ${fieldBorderClass('password')}`}
                                            placeholder="Create a strong password"
                                            value={password}
                                            onChange={handlePasswordChange}
                                            onBlur={handlePasswordBlur}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Password Strength Bar */}
                                    {password.length > 0 && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pwStrength.percent}%`, backgroundColor: pwStrength.color }}
                                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pwStrength.color }}>
                                                    {pwStrength.label}
                                                </span>
                                            </div>

                                            {/* Password Requirements Checklist */}
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                {[
                                                    { key: 'minLength', label: '6+ characters' },
                                                    { key: 'hasUppercase', label: 'Uppercase letter' },
                                                    { key: 'hasLowercase', label: 'Lowercase letter' },
                                                    { key: 'hasNumber', label: 'Contains number' },
                                                ].map(({ key, label }) => (
                                                    <div key={key} className={`flex items-center gap-1.5 text-[11px] transition-colors ${pwChecks[key] ? 'text-emerald-400' : 'text-text-muted/60'}`}>
                                                        {pwChecks[key]
                                                            ? <Check size={11} className="text-emerald-400" />
                                                            : <XIcon size={11} className="text-text-muted/40" />}
                                                        {label}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>

                                <div className="mb-5" />
                            </>
                        ) : (
                            /* OTP Step */
                            <motion.div variants={itemVariants} className="mb-6">
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 text-center">Verification Code</label>
                                <input
                                    id="reg-otp"
                                    type="text"
                                    maxLength={6}
                                    className="input-field text-center text-2xl tracking-[1em] font-bold"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                    autoFocus
                                />
                                <div className="text-center mt-4">
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={resending}
                                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                                    >
                                        {resending ? 'Sending...' : "Didn't receive code? Resend"}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        <motion.div variants={itemVariants}>
                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner" /> : (
                                    step === 1 ? (
                                        <><UserPlus size={18} /> Create Account</>
                                    ) : (
                                        <>Verify & Join</>
                                    )
                                )}
                            </button>
                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full mt-3 py-2 text-xs text-text-muted hover:text-text transition-colors"
                                >
                                    Back to info
                                </button>
                            )}
                        </motion.div>
                    </form>

                    <motion.p variants={itemVariants} className="text-center mt-6 text-sm text-text-muted">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Mail, KeyRound, Check, X as XIcon, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { getPasswordStrength, validatePassword, validateEmail } from '../hooks/useFormValidation';

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

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();

    // Password strength
    const [pwStrength, setPwStrength] = useState({ score: 0, label: '', color: 'transparent', percent: 0 });
    const [pwChecks, setPwChecks] = useState({});

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setNewPassword(val);
        setPwStrength(getPasswordStrength(val));
        const result = validatePassword(val);
        setPwChecks(result.checks || {});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (step === 1) {
            // Validate email
            const emailCheck = validateEmail(email.trim());
            if (!emailCheck.valid) {
                setError(emailCheck.message);
                return;
            }

            setLoading(true);
            try {
                await api.post('/auth/forgot-password', { email: email.trim() });
                setStep(2);
                setSuccess('Reset code sent! Check your email inbox.');
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to send reset code.');
            } finally {
                setLoading(false);
            }
        } else if (step === 2) {
            // Validate OTP
            if (otp.length !== 6) {
                setError('Please enter the 6-digit code.');
                return;
            }
            setStep(3);
            setSuccess('');
        } else if (step === 3) {
            // Validate new password
            const pwCheck = validatePassword(newPassword);
            if (!pwCheck.valid) {
                setError(pwCheck.message);
                return;
            }

            setLoading(true);
            try {
                const { data } = await api.post('/auth/reset-password', {
                    email: email.trim(),
                    otp,
                    newPassword,
                });
                setSuccess(data.message);
                setError('');
                // Redirect to login after 2 seconds
                setTimeout(() => navigate('/login'), 2000);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to reset password.');
                // If OTP is invalid/expired, go back to step 2
                if (err.response?.data?.error?.includes('code')) {
                    setStep(2);
                    setOtp('');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleResend = async () => {
        setError('');
        setResending(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
            setSuccess('New reset code sent! Check your inbox.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend code.');
        } finally {
            setResending(false);
        }
    };

    const stepTitles = ['Reset Password', 'Enter Code', 'New Password'];
    const stepDescs = [
        "Enter your email and we'll send you a reset code",
        `Enter the 6-digit code sent to ${email}`,
        'Choose a strong new password',
    ];

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
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
                        {stepTitles[step - 1]}
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-center text-text-muted text-sm mb-8">
                        {stepDescs[step - 1]}
                    </motion.p>

                    {/* Step indicator */}
                    <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-6">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    s === step ? 'w-8 bg-primary-500' : s < step ? 'w-6 bg-emerald-500' : 'w-6 bg-surface-hover'
                                }`}
                            />
                        ))}
                    </motion.div>

                    {/* Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-4"
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm mb-4"
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="mb-6"
                                >
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="mb-6"
                                >
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 text-center">
                                        Reset Code
                                    </label>
                                    <input
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
                                            onClick={handleResend}
                                            disabled={resending}
                                            className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                                        >
                                            {resending ? 'Sending...' : "Didn't receive code? Resend"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="mb-6"
                                >
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="input-field pr-11"
                                            placeholder="Create a strong password"
                                            value={newPassword}
                                            onChange={handlePasswordChange}
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Password Strength */}
                                    {newPassword.length > 0 && (
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
                            )}
                        </AnimatePresence>

                        <motion.div variants={itemVariants} className="space-y-3">
                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner" /> : (
                                    step === 1 ? <><Mail size={18} /> Send Reset Code</> :
                                    step === 2 ? <><KeyRound size={18} /> Verify Code</> :
                                    <><Check size={18} /> Reset Password</>
                                )}
                            </button>

                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => { setStep(step - 1); setError(''); setSuccess(''); }}
                                    className="w-full py-2 text-xs text-text-muted hover:text-text transition-colors flex items-center justify-center gap-1"
                                >
                                    <ArrowLeft size={14} /> Go Back
                                </button>
                            )}
                        </motion.div>
                    </form>

                    <motion.p variants={itemVariants} className="text-center mt-6 text-sm text-text-muted">
                        Remember your password?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
}

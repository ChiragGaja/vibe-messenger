import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, LogIn, Eye, EyeOff, AlertTriangle, Lock } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockCountdown, setLockCountdown] = useState('');
    const [attemptsRemaining, setAttemptsRemaining] = useState(null);
    const navigate = useNavigate();
    const setAuth = useChatStore((s) => s.setAuth);

    // Countdown timer for locked account
    useEffect(() => {
        if (!isLocked) return;

        const interval = setInterval(() => {
            const lockedUntil = localStorage.getItem('lockedUntil');
            if (!lockedUntil) {
                setIsLocked(false);
                return;
            }

            const remaining = new Date(lockedUntil) - new Date();
            if (remaining <= 0) {
                setIsLocked(false);
                setLockCountdown('');
                localStorage.removeItem('lockedUntil');
                setError('');
                return;
            }

            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setLockCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setAttemptsRemaining(null);

        if (isLocked) return;

        if (!username.trim()) {
            setError('Username is required.');
            return;
        }
        if (!password) {
            setError('Password is required.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { username: username.trim(), password });
            setAuth(data.user);
            localStorage.removeItem('lockedUntil');
            navigate('/');
        } catch (err) {
            const resp = err.response?.data;

            if (resp?.requiresVerification) {
                navigate('/register', {
                    state: { email: resp.email, step: 2 }
                });
            } else if (resp?.isLocked) {
                // Account locked
                setIsLocked(true);
                if (resp.lockedUntil) {
                    localStorage.setItem('lockedUntil', resp.lockedUntil);
                }
                setError(resp.error || 'Account temporarily locked.');
            } else {
                setError(resp?.error || 'Login failed. Please try again.');
                if (resp?.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(resp.attemptsRemaining);
                }
            }
        } finally {
            setLoading(false);
        }
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
                    <motion.h1 variants={itemVariants} className="text-3xl font-bold text-center text-text mb-1">
                        Welcome Back to Vibe
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-center text-text-muted text-sm mb-8">
                        Sign in to continue chatting
                    </motion.p>

                    {/* Error / Locked Banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`${isLocked ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} border px-4 py-3 rounded-xl text-sm mb-4`}
                            >
                                <div className="flex items-start gap-2">
                                    {isLocked ? <Lock size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                                    <div>
                                        <p>{error}</p>
                                        {isLocked && lockCountdown && (
                                            <p className="text-xs mt-1 font-mono opacity-80">
                                                Unlocks in: {lockCountdown}
                                            </p>
                                        )}
                                        {attemptsRemaining !== null && !isLocked && (
                                            <p className="text-xs mt-1 opacity-80">
                                                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit}>
                        <motion.div variants={itemVariants} className="mb-4">
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Username</label>
                            <input
                                id="login-username"
                                type="text"
                                className="input-field"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                disabled={isLocked}
                            />
                        </motion.div>

                        <motion.div variants={itemVariants} className="mb-6">
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field pr-11"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLocked}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="text-right mt-2">
                                <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <button
                                className={`btn-primary ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={loading || isLocked}
                            >
                                {loading ? <span className="spinner" /> : (
                                    isLocked ? <><Lock size={18} /> Account Locked</> : <><LogIn size={18} /> Sign In</>
                                )}
                            </button>
                        </motion.div>
                    </form>

                    <motion.p variants={itemVariants} className="text-center mt-6 text-sm text-text-muted">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Create one
                        </Link>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
}

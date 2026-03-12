import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, Shield, Info, Check, X } from 'lucide-react';
import api from '../api/axios';
import { getSocket } from '../socket/socket';

export default function AddFriendModal({ onClose, onDataRefresh }) {
    const [username, setUsername] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim()) return;
        setLoading(true);
        setFeedback(null);
        try {
            await api.post('/friends/request', { targetUsername: username.trim() });
            setFeedback({ type: 'success', msg: `Friend request sent to "${username}"!` });
            setUsername('');
        } catch (err) {
            setFeedback({ type: 'error', msg: err.response?.data?.error || 'Failed to send request.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full max-w-sm mx-4 p-6 bg-surface border border-border rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-text flex items-center gap-2">
                        <UserPlus size={18} className="text-primary-500" /> Add Friend
                    </h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username..."
                            className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-text placeholder:text-text-muted"
                            autoFocus
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`text-xs p-3 rounded-xl flex items-start gap-2 ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                                <Info size={14} className="mt-0.5 shrink-0" />
                                <span>{feedback.msg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading || !username.trim()}
                        className="w-full py-2.5 mt-2 bg-text text-background hover:opacity-90 rounded-xl font-medium text-sm transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" />
                                <span>Sending...</span>
                            </div>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Send Request
                            </span>
                        )}
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-border flex items-start gap-3 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                        <Shield size={14} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-semibold text-text mb-0.5">Privacy First</h4>
                        <p className="text-[10px] text-text-muted leading-tight">Users must accept your request before you can chat.</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

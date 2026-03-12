import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Info, Image as ImageIcon, Check, CheckSquare, Square } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';

export default function CreateGroupModal({ onClose, onGroupCreated }) {
    const { friends } = useChatStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const toggleFriend = (id) => {
        const next = new Set(selectedFriends);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedFriends(next);
    };

    const handleFileSelect = (e) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (selectedFriends.size === 0) {
            setFeedback({ type: 'error', msg: 'Select at least one friend to add to the group.' });
            return;
        }

        setLoading(true);
        setFeedback(null);
        try {
            let avatar_url = null;
            if (avatarFile) {
                const formData = new FormData();
                formData.append('files', avatarFile);
                const uploadRes = await api.post('/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data.files?.length > 0) {
                    avatar_url = uploadRes.data.files[0].url;
                }
            }

            const res = await api.post('/groups/create', {
                name: name.trim(),
                description: description.trim(),
                avatar_url,
                memberIds: Array.from(selectedFriends)
            });

            setFeedback({ type: 'success', msg: `Group "${name}" created!` });
            if (onGroupCreated) onGroupCreated(res.data.group);
            setTimeout(() => onClose(), 1500);
        } catch (err) {
            setFeedback({ type: 'error', msg: err.response?.data?.error || 'Failed to create group.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold text-text flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" /> Create New Group
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar">
                    <form id="create-group-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div
                                className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-surface-hover cursor-pointer overflow-hidden group relative transition-colors hover:border-indigo-500/50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <>
                                        <img src={avatarPreview} alt="Group Avatar Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ImageIcon size={24} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-text-muted group-hover:text-indigo-400 transition-colors">
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Avatar</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* Name & Desc */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Group Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="E.g. Weekend Warriors"
                                    maxLength={50}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-text placeholder:text-text-muted"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this group for?"
                                    maxLength={160}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-text placeholder:text-text-muted"
                                />
                            </div>
                        </div>

                        {/* Friend Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Select Members</label>
                                <span className="text-xs text-indigo-500 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                    {selectedFriends.size} selected
                                </span>
                            </div>
                            <div className="border border-border rounded-xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar bg-background">
                                {friends.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-text-muted italic">You have no friends to add.</div>
                                ) : (
                                    friends.map(friend => {
                                        const isSelected = selectedFriends.has(friend.id);
                                        return (
                                            <div
                                                key={friend.id}
                                                onClick={() => toggleFriend(friend.id)}
                                                className={`flex items-center gap-3 p-3 border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-surface-hover'}`}
                                            >
                                                <div className={`text-${isSelected ? 'indigo-500' : 'text-muted'}`}>
                                                    {isSelected ? <CheckSquare size={18} className="text-indigo-500" /> : <Square size={18} />}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-xs text-text overflow-hidden shrink-0">
                                                    {friend.avatar_url ? (
                                                        <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (friend.display_name || friend.username).charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-text truncate">{friend.display_name || friend.username}</p>
                                                    <p className="text-[10px] text-text-muted truncate">@{friend.username}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-border shrink-0 bg-surface/50">
                    <AnimatePresence mode="wait">
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`text-xs p-3 mb-4 rounded-xl flex items-start gap-2 ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                                <Info size={14} className="mt-0.5 shrink-0" />
                                <span>{feedback.msg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        form="create-group-form"
                        disabled={loading || !name.trim() || selectedFriends.size === 0}
                        className="w-full py-2.5 bg-text text-background hover:opacity-90 rounded-xl font-medium text-sm transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                <span>Create Group</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

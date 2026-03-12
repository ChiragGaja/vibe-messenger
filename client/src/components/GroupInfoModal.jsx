import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, UserMinus, Pencil, Check, Palette } from 'lucide-react';
import useChatStore from '../store/chatStore';
import api from '../api/axios';

export default function GroupInfoModal({ isOpen, onClose }) {
    const { activeChat, user, groups, setGroups, setActiveChat } = useChatStore();
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(activeChat?.display_name || activeChat?.username || '');
    const [loading, setLoading] = useState(false);
    const [updatingTheme, setUpdatingTheme] = useState(false);

    if (!isOpen || !activeChat) return null;

    const themes = [
        { id: 'indigo', hex: '#6366f1', name: 'Indigo' },
        { id: 'rose', hex: '#f43f5e', name: 'Rose' },
        { id: 'emerald', hex: '#10b981', name: 'Emerald' },
        { id: 'amber', hex: '#f59e0b', name: 'Amber' },
        { id: 'violet', hex: '#8b5cf6', name: 'Violet' }
    ];

    const handleThemeChange = async (themeId) => {
        if (!activeChat || updatingTheme || activeChat.theme_color === themeId) return;
        setUpdatingTheme(true);
        try {
            await api.put(`/groups/${activeChat.id}/theme`, { themeColor: themeId });
        } catch (error) {
            console.error('Failed to update group theme:', error);
            alert('Failed to update group theme.');
        } finally {
            setUpdatingTheme(false);
        }
    };

    const myRole = activeChat.members?.find((m) => m.id === user.id)?.role;
    const isAdmin = myRole === 'admin';

    const handleSaveName = async () => {
        if (!newName.trim() || newName === activeChat.display_name) {
            setEditingName(false);
            return;
        }
        setLoading(true);
        try {
            await api.put(`/groups/${activeChat.id}/name`, { name: newName.trim() });

            // Update activeChat and groups locally
            const updatedChat = { ...activeChat, display_name: newName.trim(), username: newName.trim() };
            setActiveChat(updatedChat);
            setGroups(groups.map(g => g.id === activeChat.id ? updatedChat : g));

            setEditingName(false);
        } catch (error) {
            console.error('Error updating name:', error);
            alert('Failed to update group name.');
        } finally {
            setLoading(false);
        }
    };

    const handleKickUser = async (memberId) => {
        if (!window.confirm('Are you sure you want to kick this user from the group?')) return;
        try {
            await api.delete(`/groups/${activeChat.id}/members/${memberId}`);

            // Update local state to remove the member
            const updatedMembers = activeChat.members.filter(m => m.id !== memberId);
            const updatedChat = { ...activeChat, members: updatedMembers };
            setActiveChat(updatedChat);
            setGroups(groups.map(g => g.id === activeChat.id ? updatedChat : g));
        } catch (error) {
            console.error('Error kicking user:', error);
            alert('Failed to kick user.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
                {/* Header Section */}
                <div className="relative p-6 flex flex-col items-center border-b border-border bg-surface-hover">
                    <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>

                    <div className="w-24 h-24 rounded-full bg-surface-active flex items-center justify-center text-3xl font-bold text-text overflow-hidden shadow-none border-4 border-surface mb-4">
                        {activeChat.avatar_url ? (
                            <img src={activeChat.avatar_url} alt={activeChat.username} className="w-full h-full object-cover" />
                        ) : (
                            (activeChat.display_name?.charAt(0) || activeChat.username?.charAt(0) || '?').toUpperCase()
                        )}
                    </div>

                    <div className="w-full flex items-center justify-center gap-2">
                        {editingName ? (
                            <div className="flex items-center gap-2 w-full max-w-[200px]">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="flex-1 bg-surface-hover border border-primary-500/50 rounded-lg px-2 py-1 text-center font-bold outline-none"
                                    disabled={loading}
                                    autoFocus
                                />
                                <button onClick={handleSaveName} disabled={loading} className="text-emerald-500 hover:text-emerald-400 p-1">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => { setEditingName(false); setNewName(activeChat.display_name || activeChat.username); }} className="text-red-500 hover:text-red-400 p-1">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-text truncate max-w-[200px]">
                                    {activeChat.display_name || activeChat.username}
                                </h2>
                                {isAdmin && (
                                    <button onClick={() => setEditingName(true)} className="text-text-muted hover:text-primary-400 transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <p className="text-sm text-text-muted mt-1">{activeChat.members?.length || 0} Members</p>
                </div>

                {/* Theme Selector UI */}
                <div className="p-4 border-b border-border bg-surface">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5 px-1">
                        <Palette size={14} className="text-primary-500" /> Chat Color Theme
                    </h3>
                    <div className="flex justify-center gap-3">
                        {themes.map((t) => {
                            const isActive = (activeChat?.theme_color || 'indigo') === t.id;
                            return (
                                <button
                                    key={t.id}
                                    disabled={updatingTheme}
                                    onClick={() => handleThemeChange(t.id)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                    style={{ backgroundColor: t.hex }}
                                    title={t.name}
                                >
                                    {isActive && <Check size={16} className="text-white drop-shadow-md" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <h3 className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Group Members</h3>
                    <div className="flex flex-col gap-1 px-2 pb-4">
                        {activeChat.members?.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-hover transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-400 overflow-hidden shrink-0">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                                        ) : (
                                            (member.display_name?.charAt(0) || member.username.charAt(0)).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text flex items-center gap-1.5">
                                            {member.id === user.id ? 'You' : member.display_name || member.username}
                                            {member.role === 'admin' && (
                                                <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md self-start mt-0.5">ADMIN</span>
                                            )}
                                        </span>
                                        <span className="text-xs text-text-muted">@{member.username}</span>
                                    </div>
                                </div>
                                {isAdmin && member.id !== user.id && (
                                    <button
                                        onClick={() => handleKickUser(member.id)}
                                        className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all focus:opacity-100"
                                        title="Kick User"
                                    >
                                        <UserMinus size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

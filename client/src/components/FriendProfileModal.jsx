import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Clock, MessageCircle, User, Image as ImageIcon, Video, FileText, Play, Palette, Check } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';

export default function FriendProfileModal({ username, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('about');
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [updatingTheme, setUpdatingTheme] = useState(false);
    const { messages, activeChat, setChatTheme } = useChatStore();

    const themes = [
        { id: 'indigo', hex: '#6366f1', name: 'Indigo' },
        { id: 'rose', hex: '#f43f5e', name: 'Rose' },
        { id: 'emerald', hex: '#10b981', name: 'Emerald' },
        { id: 'amber', hex: '#f59e0b', name: 'Amber' },
        { id: 'violet', hex: '#8b5cf6', name: 'Violet' }
    ];

    const handleThemeChange = async (themeId) => {
        if (!activeChat || updatingTheme || (activeChat.theme_color || 'indigo') === themeId) return;
        setUpdatingTheme(true);
        try {
            await api.put(`/friends/${activeChat.id}/theme`, { themeColor: themeId });
            setChatTheme(activeChat.id, themeId, !!activeChat.is_group);
        } catch (error) {
            console.error('Failed to update theme:', error);
            alert('Failed to update chat theme.');
        } finally {
            setUpdatingTheme(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get(`/auth/user/${username}`);
                setProfile(data.user);
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    // Extract all media from the loaded chunk of messages for this specific chat
    const chatMedia = messages.filter(m =>
        (m.messageType === 'image' || m.message_type === 'image' ||
            m.messageType === 'video' || m.message_type === 'video' ||
            m.messageType === 'multi' || m.message_type === 'multi' ||
            m.messageType === 'document' || m.message_type === 'document') &&
        !m.is_deleted
    ).flatMap(m => {
        // Handle single and multi
        const urls = m.fileUrls || m.file_urls || (m.fileUrl || m.file_url ? [m.fileUrl || m.file_url] : []);
        const names = m.fileNames || m.file_names || (m.fileName || m.file_name ? [m.fileName || m.file_name] : []);
        const sizes = m.fileSizes || m.file_sizes || (m.fileSize || m.file_size ? [m.fileSize || m.file_size] : []);

        return urls.map((url, i) => ({
            id: `${m.id}-${i}`,
            url,
            name: names[i] || 'Media',
            size: sizes[i] || 0,
            type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : (m.messageType === 'document' || m.message_type === 'document' ? 'document' : 'image'),
            createdAt: m.createdAt || m.created_at
        }));
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getInitials = (name) => name?.charAt(0).toUpperCase() || '?';

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'Unknown';
        const diff = Date.now() - new Date(lastSeen).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} hr ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
        return formatDate(lastSeen);
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Lightbox rendered here at max priority */}
            {lightboxMedia && (
                <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); setLightboxMedia(null); }}>
                    {lightboxMedia.match(/\.(mp4|webm|mov)$/i) ? (
                        <video src={lightboxMedia} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    ) : (
                        <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={lightboxMedia} alt="Full size" className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
                    )}
                </div>
            )}

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full max-w-md max-h-[90vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="spinner border-primary-500/30 border-t-primary-500" />
                    </div>
                ) : !profile ? (
                    <div className="p-6 text-center text-text-muted">
                        <p>Could not load profile.</p>
                        <button onClick={onClose} className="mt-3 text-sm text-primary-500 hover:underline">Close</button>
                    </div>
                ) : (
                    <>
                        {/* Header with minimalistic background */}
                        <div className="relative">
                            <div className="h-24 bg-surface-hover border-b border-border" />
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/30 transition-all"
                            >
                                <X size={16} />
                            </button>
                            {/* Avatar overlapping the banner */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-20 h-20 rounded-full bg-surface-active border-4 border-surface shadow-sm flex items-center justify-center text-text text-2xl font-bold overflow-hidden">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(profile.display_name || profile.username)
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Profile details */}
                        <div className="pt-14 pb-2 px-6 shrink-0 z-10">
                            <div className="text-center">
                                <h2 className="text-lg font-bold text-text">
                                    {profile.display_name || profile.username}
                                </h2>
                                <p className="text-sm text-text-muted">@{profile.username}</p>
                                {profile.custom_status && (
                                    <p className="mt-1 text-xs text-primary-400 italic">"{profile.custom_status}"</p>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 mb-2 border-b border-border z-10 shrink-0">
                            <button
                                onClick={() => setActiveTab('about')}
                                className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'about' ? 'text-primary-400' : 'text-text-muted hover:text-text'}`}
                            >
                                About
                                {activeTab === 'about' && <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('media')}
                                className={`flex-1 pb-3 text-sm font-semibold transition-colors relative flex items-center justify-center gap-1.5 ${activeTab === 'media' ? 'text-primary-400' : 'text-text-muted hover:text-text'}`}
                            >
                                Media
                                {activeTab === 'media' && <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('theme')}
                                className={`flex-1 pb-3 text-sm font-semibold transition-colors relative flex items-center justify-center gap-1.5 ${activeTab === 'theme' ? 'text-primary-400' : 'text-text-muted hover:text-text'}`}
                            >
                                Theme
                                {activeTab === 'theme' && <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />}
                            </button>
                        </div>

                        {/* Tab Content Area (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 pt-2 scrollbar-hide z-0">
                            <AnimatePresence mode="wait">
                                {activeTab === 'about' && (
                                    <motion.div key="about" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                                        {profile.bio && (
                                            <div className="mb-4 p-3 bg-surface-hover rounded-xl border border-border">
                                                <p className="text-sm text-text leading-relaxed">{profile.bio}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                                                    <User size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Username</div>
                                                    <div className="text-sm text-text font-medium truncate">{profile.username}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                                    <Calendar size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Joined</div>
                                                    <div className="text-sm text-text font-medium">{formatDate(profile.created_at)}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                                    <Clock size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Last Seen</div>
                                                    <div className="text-sm text-text font-medium">{formatLastSeen(profile.last_seen)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'media' && (
                                    <motion.div key="media" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="h-full">
                                        {chatMedia.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-text-muted text-center space-y-3">
                                                <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center border border-border">
                                                    <ImageIcon size={20} className="opacity-50" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text">No Media Found</p>
                                                    <p className="text-xs max-w-[200px] mt-1 mx-auto">Photos and videos shared in this active chat history will appear here.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-1">
                                                {chatMedia.map((media) => (
                                                    <div key={media.id} className="aspect-square relative rounded-md overflow-hidden bg-surface-hover group border border-border/50">
                                                        {media.type === 'document' ? (
                                                            <a href={media.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center p-2 hover:bg-black/10 dark:hover:bg-white/5 transition-colors no-underline">
                                                                <FileText size={20} className="text-primary-400 mb-1" />
                                                                <span className="text-[8px] font-medium text-text text-center line-clamp-2 w-full truncate px-1 cursor-pointer">{media.name}</span>
                                                                <span className="text-[8px] opacity-50 mt-0.5">{formatSize(media.size)}</span>
                                                            </a>
                                                        ) : (
                                                            <div className="w-full h-full cursor-pointer overflow-hidden" onClick={() => setLightboxMedia(media.url)}>
                                                                {media.type === 'video' ? (
                                                                    <>
                                                                        <video src={media.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" preload="metadata" />
                                                                        <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded-md p-1">
                                                                            <Video size={10} className="text-white" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <img src={media.url} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'theme' && (
                                    <motion.div key="theme" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="h-full flex flex-col gap-4">
                                        <div className="bg-surface-hover border border-border rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
                                                <Palette size={16} className="text-primary-500" /> Choose Chat Color
                                            </h3>
                                            <p className="text-xs text-text-muted mb-4">
                                                Customizing the theme will change the color of chat bubbles and UI elements for both of you in this conversation.
                                            </p>

                                            <div className="grid grid-cols-5 gap-3">
                                                {themes.map((t) => {
                                                    const isActive = (activeChat?.theme_color || 'indigo') === t.id;
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            disabled={updatingTheme}
                                                            onClick={() => handleThemeChange(t.id)}
                                                            className={`w-full aspect-square rounded-full flex items-center justify-center transition-all ${isActive ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                                            style={{ backgroundColor: t.hex }}
                                                            title={t.name}
                                                        >
                                                            {isActive && <Check size={18} className="text-white drop-shadow-md" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

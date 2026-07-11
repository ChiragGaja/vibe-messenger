import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Phone, Video, Info, ArrowLeft, PanelLeftOpen, X, Search } from 'lucide-react';
import useChatStore from '../store/chatStore';
import api from '../api/axios';
import { getSocket } from '../socket/socket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import GroupInfoModal from './GroupInfoModal';
import FriendProfileModal from './FriendProfileModal';
import useCallStore from '../store/callStore';

export default function ChatWindow({ onBack, onToggleSidebar, sidebarOpen }) {
    const {
        activeChat, messages, setMessages, prependMessages, hasMoreMessages,
        typingUser, onlineUsers, user, pendingMessages
    } = useChatStore();

    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showFriendProfile, setShowFriendProfile] = useState(false);


    // Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const isOnline = onlineUsers.has(activeChat?.username);

    const { setLocalStream, setCallStatus, setPeerInstance, setRemoteStream } = useCallStore();

    const getInitials = (name) => name?.charAt(0).toUpperCase() || '?';

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return '';
        const diff = Date.now() - new Date(lastSeen).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const initiateCall = async (isVideo) => {
        if (!activeChat || activeChat.is_group) {
            alert("Group calling is not supported yet.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(stream);
            setCallStatus('calling');

            const Peer = (await import('simple-peer')).default;
            const socket = getSocket();

            const peer = new Peer({
                initiator: true,
                trickle: false,
                stream: stream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('signal', (data) => {
                socket.emit('call_user', {
                    userToCall: activeChat.username,
                    signalData: data,
                    callerName: user?.display_name,
                    callerAvatar: user?.avatar_url,
                    isVideo: isVideo
                });
            });

            peer.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
            });

            setPeerInstance(peer);
        } catch (err) {
            console.error('Failed to get local stream', err);
            alert('Could not access camera or microphone.');
            setCallStatus('idle');
        }
    };

    useEffect(() => {
        if (!activeChat) return;
        const loadMessages = async () => {
            setLoading(true);
            try {
                const endpoint = activeChat.is_group ? `/messages/group/${activeChat.id}` : `/messages/${activeChat.username}`;
                const { data } = await api.get(`${endpoint}?limit=50`);
                setMessages(data.messages, data.hasMore);
                const socket = getSocket();
                const unreadIds = data.messages
                    .filter((m) => m.sender_username === activeChat.username && m.status !== 'read')
                    .map((m) => m.id);
                if (unreadIds.length > 0 && socket) {
                    socket.emit('message_read', { messageIds: unreadIds, senderUsername: activeChat.username });
                }
            } catch (err) {
                console.error('Failed to load messages:', err);
                setMessages([], false);
            } finally {
                setLoading(false);
            }
        };
        loadMessages();
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    }, [activeChat?.username]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUser]);

    const loadOlder = async () => {
        if (loadingMore || !hasMoreMessages || messages.length === 0) return;
        setLoadingMore(true);
        const container = containerRef.current;
        const prevH = container?.scrollHeight || 0;
        try {
            const endpoint = activeChat.is_group ? `/messages/group/${activeChat.id}` : `/messages/${activeChat.username}`;
            const { data } = await api.get(`${endpoint}?limit=30&before=${messages[0]?.id}`);
            prependMessages(data.messages, data.hasMore);
            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevH;
            });
        } catch (err) {
            console.error('Failed to load older:', err);
        } finally {
            setLoadingMore(false);
        }
    };


    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim() || searchQuery.length < 2) return;
        setIsSearching(true);
        try {
            const queryParams = activeChat.is_group 
                ? `?q=${encodeURIComponent(searchQuery)}&groupId=${activeChat.id}`
                : `?q=${encodeURIComponent(searchQuery)}&friendUsername=${activeChat.username}`;
            const { data } = await api.get(`/messages/search${queryParams}`);
            setSearchResults(data.results);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Color maps for dynamic Tailwind injection
    const themeColors = {
        indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
        rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
        emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
        amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
        violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
    };

    const getThemeStyles = () => {
        const colorName = activeChat?.theme_color || 'indigo';
        const palette = themeColors[colorName] || themeColors['indigo'];
        const styles = {};
        Object.entries(palette).forEach(([shade, hex]) => {
            styles[`--color-primary-${shade}`] = hex;
        });
        return styles;
    };

    return (
        <div className="flex flex-col h-full w-full relative" style={getThemeStyles()}>
            {/* Chat Header */}
            <div className="px-3 md:px-5 py-3 border-b border-border bg-surface flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    {/* Mobile back button */}
                    <button
                        onClick={onBack}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all shrink-0"
                        title="Back to chats"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Desktop: show sidebar toggle when sidebar is hidden */}
                    {!sidebarOpen && (
                        <button
                            onClick={onToggleSidebar}
                            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all shrink-0"
                            title="Show Sidebar"
                        >
                            <PanelLeftOpen size={18} />
                        </button>
                    )}

                    <div
                        className="flex items-center gap-2 md:gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => !activeChat?.is_group && setShowFriendProfile(true)}
                    >
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center text-text font-medium text-sm overflow-hidden shadow-none">
                                {activeChat?.avatar_url ? (
                                    <img src={activeChat.avatar_url} alt={activeChat.username} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(activeChat?.display_name || activeChat?.username)
                                )}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-surface
                  ${isOnline ? 'bg-emerald-500' : 'bg-border'}`} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-text truncate max-w-[140px] md:max-w-[200px]">{activeChat?.display_name || activeChat?.username}</div>
                            <div className={`text-xs truncate max-w-[160px] md:max-w-[250px] ${activeChat?.is_group ? 'text-indigo-400' : isOnline ? 'text-emerald-400' : 'text-text-muted'}`}>
                                {activeChat?.is_group ? 'Group Chat' : isOnline ? (activeChat?.custom_status || 'Online') : (activeChat?.custom_status || `Last seen ${formatLastSeen(activeChat?.last_seen)}`)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-all
                            ${showSearch ? 'text-primary-500 bg-primary-500/10' : 'text-text-muted hover:text-text'}`}
                        title="Search Messages"
                    >
                        <Search size={16} />
                    </button>
                    <button
                        onClick={() => initiateCall(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                        title="Start Audio Call"
                    >
                        <Phone size={16} />
                    </button>
                    <button
                        onClick={() => initiateCall(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                        title="Start Video Call"
                    >
                        <Video size={16} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 md:px-5 py-2 border-b border-border bg-surface flex flex-col gap-2 overflow-hidden z-10 shadow-sm"
                    >
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 transition-colors text-text placeholder-text-muted"
                                autoFocus
                            />
                            <button type="submit" disabled={isSearching || searchQuery.length < 2} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50">
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </form>
                        
                        {searchResults.length > 0 && (
                            <div className="max-h-[30vh] overflow-y-auto custom-scrollbar flex flex-col gap-1 mt-1 border border-border rounded-lg bg-surface p-1">
                                {searchResults.map((res) => (
                                    <div key={res.id} className="p-2 hover:bg-surface-hover rounded-md transition-colors text-xs flex flex-col gap-1.5 border-b border-border last:border-0 border-dashed">
                                        <div className="flex justify-between items-center opacity-80">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-400 font-bold flex items-center justify-center text-[8px] overflow-hidden">
                                                    {res.sender_avatar_url ? (
                                                        <img src={res.sender_avatar_url} alt="av" className="w-full h-full object-cover" />
                                                    ) : res.sender_username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-text">{res.sender_username}</span>
                                            </div>
                                            <span className="text-text-muted">{new Date(res.created_at).toLocaleDateString()} {new Date(res.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-text pl-5 break-words line-clamp-3 leading-relaxed">{res.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchResults.length === 0 && searchQuery.length > 0 && !isSearching && (
                            <div className="text-xs text-text-muted p-2 text-center">No results found or type to search</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-3 md:px-5 py-4 flex flex-col gap-1 relative" onTouchStart={() => document.activeElement?.blur()}>
                

                {hasMoreMessages && (
                    <button
                        onClick={loadOlder}
                        disabled={loadingMore}
                        className="self-center px-4 py-1.5 rounded-full border border-border text-xs text-text-muted hover:bg-surface-hover hover:text-primary-400 transition-all mb-2 flex items-center gap-1.5"
                    >
                        <ArrowUp size={12} /> {loadingMore ? 'Loading...' : 'Load older messages'}
                    </button>
                )}

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="spinner border-primary-500/30 border-t-primary-500" />
                    </div>
                ) : messages.length === 0 && pendingMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
                        <span className="text-4xl">👋</span>
                        <p className="text-sm font-medium">Send a message to {activeChat?.username}</p>
                    </div>
                ) : (
                    <>
                        {[...messages, ...pendingMessages.filter(m => activeChat.is_group ? m.group_id === activeChat.id : m.recipientUsername === activeChat.username)].map((msg) => (
                            <MessageBubble
                                key={msg.id || msg.tempId}
                                message={msg}
                                isOwn={msg.sender_username === user?.username}
                            />
                        ))}
                    </>
                )}

                {typingUser && typingUser === activeChat?.username && (
                    <TypingIndicator />
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput />

            {/* Modals */}
            <AnimatePresence>
                {showGroupInfo && <GroupInfoModal isOpen={showGroupInfo} onClose={() => setShowGroupInfo(false)} />}
                {showFriendProfile && activeChat && !activeChat.is_group && (
                    <FriendProfileModal username={activeChat.username} onClose={() => setShowFriendProfile(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

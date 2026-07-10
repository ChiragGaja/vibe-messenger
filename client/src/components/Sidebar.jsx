import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Inbox, LogOut, Search, Sun, Moon, Star, MessageSquare, Image as ImageIcon, Video, FileText, Mic, Users, PanelLeftClose, PanelLeftOpen, Check, CheckCheck, CircleDot, Plus } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { useTheme } from '../context/ThemeContext';
import AddFriendModal from './AddFriendModal';
import CreateGroupModal from './CreateGroupModal';
import FriendRequests from './FriendRequests';
import api from '../api/axios';

const friendVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
    }),
};

export default function Sidebar({ onDataRefresh, onOpenProfile, sidebarOpen, onToggleSidebar, onOpenStatusViewer, onOpenStatusUploader }) {
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [statusGroups, setStatusGroups] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('chats');
    const [starredMessages, setStarredMessages] = useState([]);
    const { user, friends, groups = [], friendRequests, onlineUsers, activeChat, setActiveChat, logout, typingUsers } = useChatStore();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        if (activeTab === 'starred' && user) {
            api.get('/messages/starred/list').then(res => setStarredMessages(res.data)).catch(console.error);
        }
    }, [activeTab, user]);

    // Fetch statuses
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const res = await api.get('/status');
                setStatusGroups(res.data.statusGroups);
            } catch (err) {
                console.error('Failed to fetch statuses', err);
            }
        };
        fetchStatuses();
        const interval = setInterval(fetchStatuses, 30000);
        return () => clearInterval(interval);
    }, []);

    const allChats = [...friends, ...groups];
    const filteredFriends = allChats
        .filter((f) => f.username.toLowerCase().includes(search.toLowerCase()) || (f.display_name && f.display_name.toLowerCase().includes(search.toLowerCase())))
        .sort((a, b) => {
            const aOn = onlineUsers.has(a.username);
            const bOn = onlineUsers.has(b.username);
            if (aOn && !bOn) return -1;
            if (!aOn && bOn) return 1;
            return 0;
        });

    const getInitials = (name) => name?.charAt(0).toUpperCase() || '?';

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return '';
        const diff = Date.now() - new Date(lastSeen).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        return Math.floor(hrs / 24) + 'd ago';
    };

    const formatTime = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleChatSelect = (friend) => {
        setActiveChat(friend);
        // On mobile, selecting a chat will trigger the Dashboard useEffect to hide sidebar
    };

    return (
        <>
            <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                className="w-full md:w-80 lg:w-96 md:min-w-[320px] bg-surface/95 backdrop-blur-xl border-r border-border flex flex-col h-full shrink-0 z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] relative"
            >
                {/* Header */}
                <div className="p-4 md:p-5 border-b border-border shrink-0 top-0 bg-surface/80 backdrop-blur-md z-30 relative">
                    {/* Title Row */}
                    <div className="flex justify-between items-center mb-4 relative">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
                            Vibe
                        </h1>
                        {/* Desktop sidebar collapse toggle */}
                        <button
                            onClick={onToggleSidebar}
                            className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text transition-all"
                            title="Hide Sidebar"
                        >
                            <PanelLeftClose size={16} />
                        </button>
                    </div>

                    {/* Icon Toolbar Row */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-4 relative">
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeTab === 'chats' ? 'text-text bg-surface-active' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                            title="Chats"
                        >
                            <MessageSquare size={16} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => setActiveTab('starred')}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeTab === 'starred' ? 'text-text bg-surface-active' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                            title="Starred Messages"
                        >
                            <Star size={16} strokeWidth={1.5} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative ${showStatusDropdown ? 'text-text bg-surface-active' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                                title="Status Updates"
                            >
                                <CircleDot size={16} strokeWidth={1.5} />
                                {statusGroups.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-500" />
                                )}
                            </button>

                            {/* Status Dropdown */}
                            <AnimatePresence>
                                {showStatusDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                                    >
                                        <div className="p-2 border-b border-border">
                                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 py-1">Status Updates</p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                            {/* My Status */}
                                            {(() => {
                                                const myGroup = statusGroups.find(g => g.userId === user?.id);
                                                return (
                                                    <button
                                                        onClick={() => { setShowStatusDropdown(false); myGroup ? onOpenStatusViewer?.(myGroup.statuses, 0) : onOpenStatusUploader?.(); }}
                                                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-surface-hover transition-all text-left"
                                                    >
                                                        <div className={`relative w-9 h-9 rounded-full flex-shrink-0 p-[2px] ${myGroup ? 'bg-gradient-to-tr from-primary-400 to-indigo-500' : 'bg-surface-hover border border-dashed border-border'}`}>
                                                            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden text-xs font-bold">
                                                                {user?.avatarUrl ? <img src={user.avatarUrl} alt="Me" className="w-full h-full object-cover" /> : user?.username?.charAt(0).toUpperCase()}
                                                            </div>
                                                            {!myGroup && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center border-2 border-surface"><Plus size={8} className="text-white" /></div>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-text truncate">{myGroup ? 'My Status' : 'Add Status'}</div>
                                                            <div className="text-[11px] text-text-muted">{myGroup ? `${myGroup.statuses.length} update${myGroup.statuses.length > 1 ? 's' : ''}` : 'Tap to add'}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })()}

                                            {/* Friends' Statuses */}
                                            {statusGroups.filter(g => g.userId !== user?.id).map(group => (
                                                <button
                                                    key={group.userId}
                                                    onClick={() => { setShowStatusDropdown(false); onOpenStatusViewer?.(group.statuses, 0); }}
                                                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-surface-hover transition-all text-left"
                                                >
                                                    <div className="w-9 h-9 rounded-full flex-shrink-0 p-[2px] bg-gradient-to-tr from-primary-400 to-indigo-500">
                                                        <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden text-xs font-bold">
                                                            {group.avatarUrl ? <img src={group.avatarUrl} alt={group.username} className="w-full h-full object-cover" /> : group.username.charAt(0).toUpperCase()}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-text truncate">{group.displayName || group.username}</div>
                                                        <div className="text-[11px] text-text-muted">{group.statuses.length} update{group.statuses.length > 1 ? 's' : ''}</div>
                                                    </div>
                                                </button>
                                            ))}

                                            {statusGroups.filter(g => g.userId !== user?.id).length === 0 && (
                                                <div className="text-xs text-text-muted text-center py-3 px-2">No friend statuses yet</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-5 bg-border mx-1" />

                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
                        </button>
                        <button
                            onClick={() => setShowAddFriend(true)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                            title="Add Friend"
                        >
                            <UserPlus size={16} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                            title="Create Group"
                        >
                            <Users size={16} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => setShowRequests(!showRequests)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative ${showRequests ? 'text-text bg-surface-active' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                            title="Friend Requests"
                        >
                            <Inbox size={16} strokeWidth={1.5} />
                            {friendRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] font-bold text-white border border-surface">
                                        {friendRequests.length}
                                    </span>
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors" size={16} strokeWidth={1.5} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10 pr-4 py-2"
                        />
                    </div>
                </div>

                {/* Lists Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 relative space-y-1 scrollbar-hide">
                    {showRequests && <FriendRequests />}

                    {activeTab === 'chats' ? (
                        filteredFriends.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted p-6 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center">
                                    <Search size={24} className="opacity-50" />
                                </div>
                                <div>
                                    <p className="font-semibold text-text mb-1">No friends found</p>
                                    <p className="text-sm opacity-80">Try adjusting your search or add new friends above.</p>
                                </div>
                            </div>
                        ) : (
                            filteredFriends.map((friend, i) => {
                                const isOnline = onlineUsers.has(friend.username);
                                const isActive = activeChat?.username === friend.username;
                                return (
                                    <motion.div
                                        key={friend.id}
                                        custom={i}
                                        variants={friendVariants}
                                        initial="hidden"
                                        animate="visible"
                                        onClick={() => handleChatSelect(friend)}
                                        className={'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 mb-0.5 ' + (isActive ? 'bg-surface-active' : 'hover:bg-surface-hover')}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center text-text font-medium text-sm overflow-hidden">
                                                {friend.avatar_url ? (
                                                    <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    getInitials(friend.display_name || friend.username)
                                                )}
                                            </div>
                                            <span className={'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ' + (isOnline ? 'bg-emerald-500' : 'bg-border')} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <div className="text-sm font-bold text-text truncate pr-2">{friend.display_name || friend.username}</div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {friend.last_message_time && (
                                                        <div className="text-[10px] text-text-muted">
                                                            {formatTime(friend.last_message_time)}
                                                        </div>
                                                    )}
                                                    {friend.unread_count > 0 && (
                                                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                            {friend.unread_count > 99 ? '99+' : friend.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-text-muted truncate flex items-center gap-1">
                                                {typingUsers.has(friend.username) ? (
                                                    <span className="text-primary-400 font-medium italic animate-pulse">typing...</span>
                                                ) : friend.last_message_time ? (
                                                    <>
                                                        {friend.last_message_sender_id === user?.id && (
                                                            <span className="shrink-0">
                                                                {friend.last_message_status === 'read' ? (
                                                                    <CheckCheck size={14} className="text-blue-500" />
                                                                ) : friend.last_message_status === 'delivered' ? (
                                                                    <CheckCheck size={14} className="text-text-muted" />
                                                                ) : (
                                                                    <Check size={14} className="text-text-muted" />
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="truncate">
                                                            {friend.last_message_content || (
                                                                <span className="italic flex items-center gap-1">
                                                                    {friend.last_message_type === 'image' && <ImageIcon size={12} />}
                                                                    {friend.last_message_type === 'video' && <Video size={12} />}
                                                                    {friend.last_message_type === 'audio' && <Mic size={12} />}
                                                                    {friend.last_message_type === 'document' && <FileText size={12} />}
                                                                    {friend.last_message_type}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </>
                                                ) : friend.is_group ? (
                                                    <span className="text-indigo-400">Group Chat</span>
                                                ) : isOnline ? (
                                                    <span className="text-emerald-400">Online</span>
                                                ) : (
                                                    'Last seen ' + formatLastSeen(friend.last_seen)
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )
                    ) : (
                        starredMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted p-6 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                    <Star size={24} className="text-yellow-500 opacity-50" />
                                </div>
                                <div>
                                    <p className="font-semibold text-text mb-1">No starred messages</p>
                                    <p className="text-sm opacity-80">Star a message in chat to see it here.</p>
                                </div>
                            </div>
                        ) : (
                            starredMessages.map((msg, i) => (
                                <div key={'star-' + msg.id + '-' + i} className="p-3 bg-surface-hover rounded-xl border border-transparent hover:border-border transition-all mb-2 shadow-sm group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Star size={14} className="text-yellow-500 fill-yellow-500 shrink-0" />
                                            <span className="text-xs font-semibold text-text truncate max-w-[120px]">
                                                {msg.sender_username}
                                            </span>
                                            <span className="text-xs text-text-muted opacity-50">&rarr;</span>
                                            <span className="text-xs font-medium text-text-muted truncate max-w-[100px]">
                                                {msg.recipient_username}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-text-muted shrink-0 ml-2">
                                            {formatTime(msg.created_at)}
                                        </div>
                                    </div>
                                    <div className="text-sm bg-surface p-2.5 rounded-lg border border-border">
                                        {msg.content ? (
                                            <span className="line-clamp-3 whitespace-pre-wrap break-words">{msg.content}</span>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-primary-400 italic">
                                                {msg.message_type === 'image' && <ImageIcon size={14} />}
                                                {msg.message_type === 'video' && <Video size={14} />}
                                                {msg.message_type === 'audio' && <Mic size={14} />}
                                                {msg.message_type === 'document' && <FileText size={14} />}
                                                <span>{msg.message_type}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>



                {/* User Footer */}
                <div className="p-4 flex items-center gap-3 bg-surface z-20">
                    <div
                        className="w-10 h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center text-text font-medium text-sm flex-shrink-0 cursor-pointer overflow-hidden transition-all hover:bg-surface-active"
                        onClick={onOpenProfile}
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                            getInitials(user?.displayName || user?.username)
                        )}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenProfile}>
                        <div className="text-sm font-medium text-text truncate hover:text-text-muted transition-colors">{user?.displayName || user?.username}</div>
                        {user?.customStatus && (
                            <div className="text-xs text-text-muted truncate">{user?.customStatus}</div>
                        )}
                    </div>
                    <button onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-all" title="Logout">
                        <LogOut size={16} strokeWidth={1.5} />
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {showAddFriend && (
                    <AddFriendModal onClose={() => setShowAddFriend(false)} onDataRefresh={onDataRefresh} />
                )}
                {showCreateGroup && (
                    <CreateGroupModal onClose={() => setShowCreateGroup(false)} onGroupCreated={(group) => {
                        onDataRefresh?.();
                    }} />
                )}
            </AnimatePresence>
        </>
    );
}

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useChatStore from '../store/chatStore';
import useCallStore from '../store/callStore';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socket';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfilePanel from '../components/ProfilePanel';
import IncomingCallDialog from '../components/IncomingCallDialog';
import CallWindow from '../components/CallWindow';
import StatusUploader from '../components/StatusUploader';
import StatusViewer from '../components/StatusViewer';
import InstallPrompt from '../components/InstallPrompt';
import { MessageSquare, PanelLeftOpen } from 'lucide-react';

export default function Dashboard() {
    const [showProfile, setShowProfile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showUploader, setShowUploader] = useState(false);
    const [viewerData, setViewerData] = useState(null); // { statuses: [], initialIndex: 0 }
    const navigate = useNavigate();
    const {
        user, setFriends, setGroups, setFriendRequests, setConnected,
        setUserOnline, setUserOffline, addMessage, updateMessageStatus,
        setTypingUser, addFriendRequest, activeChat, isConnected,
        editMessage, deleteMessage, updateReactions, setActiveChat, setChatTheme
    } = useChatStore();

    const { setIncomingCall, setCallStatus, endCall, peerInstance } = useCallStore();

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // Auto-hide sidebar on mobile when a chat is selected
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile && activeChat) {
            setSidebarOpen(false);
        }
    }, [activeChat]);

    const loadData = useCallback(async () => {
        try {
            const [friendsRes, requestsRes, groupsRes] = await Promise.all([
                api.get('/friends'),
                api.get('/friends/requests'),
                api.get('/groups'),
            ]);
            setFriends(friendsRes.data.friends);
            setFriendRequests(requestsRes.data.requests);
            setGroups(groupsRes.data.groups);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    }, [setFriends, setFriendRequests, setGroups]);

    useEffect(() => {
        if (user) loadData();
    }, [user, loadData]);

    useEffect(() => {
        if (!user) return;
        if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
            navigator.serviceWorker.ready.then(async (registration) => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                        if (!publicVapidKey) return;
                        const urlBase64ToUint8Array = (base64String) => {
                            const padding = '='.repeat((4 - base64String.length % 4) % 4);
                            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                            const rawData = window.atob(base64);
                            const outputArray = new Uint8Array(rawData.length);
                            for (let i = 0; i < rawData.length; ++i) {
                                outputArray[i] = rawData.charCodeAt(i);
                            }
                            return outputArray;
                        };
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                        });
                        await api.post('/push/subscribe', subscription);
                    }
                }
            }).catch(console.error);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const socket = connectSocket();

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('new_message', (message) => {
            const currentActiveChat = useChatStore.getState().activeChat;
            if (
                currentActiveChat &&
                (message.senderUsername === currentActiveChat.username ||
                    message.recipientUsername === currentActiveChat.username)
            ) {
                addMessage(message);
                if (message.senderUsername === currentActiveChat.username) {
                    socket.emit('message_read', {
                        messageIds: [message.id],
                        senderUsername: message.senderUsername,
                    });
                }
            }
            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(message.senderUsername, {
                    body: message.messageType === 'text' ? message.content : `Sent a ${message.messageType}`,
                });
            }
        });

        socket.on('user_online', ({ username }) => setUserOnline(username));
        socket.on('user_offline', ({ username }) => setUserOffline(username));

        socket.on('typing', ({ username }) => {
            useChatStore.getState().setTypingUser(username);
        });
        socket.on('stop_typing', ({ username }) => {
            useChatStore.getState().removeTypingUser(username);
        });

        socket.on('messages_read', ({ messageIds }) => updateMessageStatus(messageIds, 'read'));

        socket.on('message_edited', ({ messageId, newContent }) => editMessage(messageId, newContent));
        socket.on('message_deleted', ({ messageId }) => deleteMessage(messageId));
        socket.on('reaction_updated', ({ messageId, reactions }) => updateReactions(messageId, reactions));
        socket.on('theme_updated', ({ chatId, themeColor, isGroup }) => {
            useChatStore.getState().setChatTheme(chatId, themeColor, isGroup);
        });

        socket.on('friend_request_received', ({ id, senderUsername, senderId, createdAt }) => {
            addFriendRequest({
                id: id,
                sender_username: senderUsername,
                sender_id: senderId,
                created_at: createdAt,
            });
        });
        socket.on('friend_request_accepted', () => loadData());

        socket.on('call_incoming', (callerData) => {
            if (useCallStore.getState().callStatus === 'idle') {
                setIncomingCall(callerData);
            } else {
                socket.emit('call_rejected', { callerUsername: callerData.callerUsername });
            }
        });

        socket.on('call_answered', ({ signal }) => {
            const currentPeer = useCallStore.getState().peerInstance;
            if (currentPeer && !currentPeer.destroyed) {
                currentPeer.signal(signal);
                setCallStatus('connected');
            }
        });

        socket.on('call_declined', () => {
            endCall();
            alert('Call declined.');
        });

        socket.on('call_ended', () => {
            endCall();
        });

        socket.on('ice_candidate_received', ({ candidate }) => {
            // simple-peer handles ICE under the hood
        });

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => { disconnectSocket(); setConnected(false); };
    }, [user]);

    // Mobile back handler: show sidebar, clear active chat
    const handleMobileBack = () => {
        setSidebarOpen(true);
        setActiveChat(null);
    };

    if (!user) return null;

    return (
        <div className="flex overflow-hidden bg-background relative" style={{ height: 'var(--app-height, 100dvh)' }}>
            <AnimatePresence>
                {!isConnected && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50 bg-red-500/15 backdrop-blur-sm border-b border-red-500/20 text-red-400 text-xs font-semibold text-center py-1.5"
                    >
                        Reconnecting...
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar — toggled by button, full-width on mobile when no chat */}
            {sidebarOpen && (
                <div className={`flex shrink-0 ${!activeChat ? 'w-full md:w-auto' : 'hidden md:flex'}`}>
                    <Sidebar
                        onDataRefresh={loadData}
                        onOpenProfile={() => setShowProfile(true)}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(false)}
                        onOpenStatusViewer={(statuses, index) => setViewerData({ statuses, initialIndex: index })}
                        onOpenStatusUploader={() => setShowUploader(true)}
                    />
                </div>
            )}

            {/* Chat area — visible when sidebar is hidden OR a chat is active */}
            <div className={`flex-1 flex flex-col min-w-0 ${!sidebarOpen || activeChat ? 'flex' : 'hidden md:flex'}`}>
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative h-full bg-background transition-all overflow-hidden">
                    
                    {/* Sidebar toggle when sidebar is hidden */}
                    {!sidebarOpen && (
                        <div className="absolute top-3 left-3 z-10 hidden md:block">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:bg-surface-hover text-text-muted hover:text-text transition-all shadow-sm"
                                title="Show Sidebar"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                        </div>
                    )}

                    {/* Chat or Empty State */}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <AnimatePresence mode="wait">
                            {activeChat ? (
                                <motion.div
                                    key={activeChat.username}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="flex flex-col h-full"
                                >
                                    <ChatWindow
                                        onBack={handleMobileBack}
                                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                                        sidebarOpen={sidebarOpen}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 flex flex-col items-center justify-center gap-2 text-text-muted relative h-full"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-lg overflow-hidden mb-2">
                                        <img src="/vibe-icon.png" alt="Vibe" className="w-full h-full object-cover opacity-90" />
                                    </div>
                                    <h3 className="text-xl font-bold text-text">Select a conversation</h3>
                                    <p className="text-sm max-w-[280px] text-center opacity-70">Choose a friend from the sidebar to start chatting, or add a new friend!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Global Modals */}
            <AnimatePresence>
                {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
                {showUploader && <StatusUploader onClose={() => setShowUploader(false)} />}
                {viewerData && <StatusViewer statuses={viewerData.statuses} initialIndex={viewerData.initialIndex} onClose={() => setViewerData(null)} />}
            </AnimatePresence>

            <IncomingCallDialog />
            <InstallPrompt />
            <CallWindow />
        </div>
    );
}

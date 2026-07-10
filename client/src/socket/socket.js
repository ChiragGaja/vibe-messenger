import { io } from 'socket.io-client';
import useChatStore from '../store/chatStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
    if (socket && socket.connected) return socket;

    const token = localStorage.getItem('accessToken');

    socket = io(SOCKET_URL, {
        withCredentials: true,
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
        console.log('🟢 Socket connected:', socket.id);
        
        // Sync pending offline messages
        const state = useChatStore.getState();
        if (state.pendingMessages?.length > 0) {
            console.log(`Syncing ${state.pendingMessages.length} pending messages...`);
            // We use spread to avoid mutating while iterating
            [...state.pendingMessages].forEach(msg => {
                socket.emit('send_message', {
                    recipientUsername: msg.recipientUsername,
                    groupId: msg.group_id,
                    content: msg.content,
                    messageType: msg.message_type,
                    replyToId: msg.reply_to_id
                }, (res) => {
                    if (res?.success) {
                        state.removePendingMessage(msg.tempId);
                        state.addMessage(res.message);
                    }
                });
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('🔴 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

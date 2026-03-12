import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

let socket = null;

export const connectSocket = (token) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
        console.log('🟢 Socket connected:', socket.id);
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

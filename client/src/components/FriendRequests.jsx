import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserRoundX, Check, X } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import { getSocket } from '../socket/socket';

export default function FriendRequests({ onDataRefresh }) {
    const { friendRequests, removeFriendRequest } = useChatStore();
    const [loadingId, setLoadingId] = useState(null);

    const handleAction = async (requestId, action, senderUsername) => {
        setLoadingId(requestId);
        try {
            await api.put(`/friends/request/${requestId}`, { action });
            removeFriendRequest(requestId);
            const socket = getSocket();
            if (socket && action === 'accept') {
                socket.emit('friend_request_responded', { senderUsername, action });
            }
            if (action === 'accept') onDataRefresh();
        } catch (err) {
            console.error('Failed to handle friend request:', err);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="px-2 py-1 border-b border-border">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">Pending Requests</div>
            {friendRequests.map((req) => (
                <motion.div
                    key={req.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {req.sender_username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text truncate">{req.sender_username}</div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleAction(req.id, 'accept', req.sender_username)}
                            disabled={loadingId === req.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={() => handleAction(req.id, 'reject', req.sender_username)}
                            disabled={loadingId === req.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

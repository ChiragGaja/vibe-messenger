import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../store/chatStore';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const pendingMessages = useChatStore(state => state.pendingMessages);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-orange-500/90 backdrop-blur-md border-b border-orange-500/20 text-white text-sm font-medium text-center py-2 px-4 shadow-lg flex items-center justify-center gap-2"
                >
                    <WifiOff size={16} />
                    <span>You are offline. {pendingMessages.length > 0 ? `${pendingMessages.length} messages waiting to send.` : 'App is running in offline mode.'}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

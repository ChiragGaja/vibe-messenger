import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Send, ChevronUp } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import { getSocket } from '../socket/socket';

export default function StatusViewer({ statuses, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [showViews, setShowViews] = useState(false);
    const [replyText, setReplyText] = useState('');
    const { user } = useChatStore();
    
    const videoRef = useRef(null);
    const reqRef = useRef(null);
    const startTimeRef = useRef(null);
    const currentDurationRef = useRef(5000); // 5s for images

    const currentStatus = statuses[currentIndex];
    const isMyStatus = currentStatus?.userId === user?.id;

    const nextStatus = () => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const prevStatus = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    };

    const handleTap = (e) => {
        const width = window.innerWidth;
        if (e.clientX < width / 3) {
            prevStatus();
        } else {
            nextStatus();
        }
    };

    useEffect(() => {
        if (!currentStatus) return;
        
        // Record view if not my status
        if (!isMyStatus && currentStatus.id) {
            api.post(`/status/${currentStatus.id}/view`).catch(err => console.error('Failed to record view:', err));
        }

        setProgress(0);
        startTimeRef.current = performance.now();
        
        if (currentStatus.mediaType === 'video') {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(e => console.error("Video play error", e));
            }
        } else {
            currentDurationRef.current = 5000;
            const updateProgress = (time) => {
                if (!startTimeRef.current) startTimeRef.current = time;
                const elapsed = time - startTimeRef.current;
                const percent = (elapsed / currentDurationRef.current) * 100;
                
                if (percent >= 100) {
                    setProgress(100);
                    nextStatus();
                } else {
                    setProgress(percent);
                    reqRef.current = requestAnimationFrame(updateProgress);
                }
            };
            reqRef.current = requestAnimationFrame(updateProgress);
        }

            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [currentIndex, currentStatus, isMyStatus, showViews]);

    // Pause when views modal is open
    useEffect(() => {
        if (showViews) {
            if (videoRef.current) videoRef.current.pause();
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        } else {
            if (videoRef.current) videoRef.current.play().catch(() => {});
            if (currentStatus?.mediaType !== 'video') {
                startTimeRef.current = performance.now() - (progress / 100) * currentDurationRef.current;
                const updateProgress = (time) => {
                    const elapsed = time - startTimeRef.current;
                    const percent = (elapsed / currentDurationRef.current) * 100;
                    if (percent >= 100) { setProgress(100); nextStatus(); }
                    else { setProgress(percent); reqRef.current = requestAnimationFrame(updateProgress); }
                };
                reqRef.current = requestAnimationFrame(updateProgress);
            }
        }
    }, [showViews]);

    const handleReply = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        
        const socket = getSocket();
        socket.emit('send_message', {
            recipientUsername: currentStatus.ownerUsername,
            content: replyText,
            messageType: 'text',
            linkImage: currentStatus.mediaUrl,
            linkTitle: 'Replying to Status'
        });
        
        setReplyText('');
        onClose();
    };

    const handleVideoTimeUpdate = () => {
        if (!videoRef.current) return;
        const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(percent);
    };

    const handleVideoEnded = () => {
        setProgress(100);
        nextStatus();
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins === 0 ? 1 : mins}m`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ago`;
    };

    if (!currentStatus) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh]"
            >
                {/* Progress bars container */}
                <div className="absolute top-4 left-4 right-4 z-50 flex gap-1 sm:max-w-md sm:mx-auto">
                    {statuses.map((_, idx) => (
                        <div key={idx} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-75"
                                style={{ 
                                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="absolute top-8 left-4 z-50 flex items-center gap-2 sm:max-w-md sm:mx-auto sm:left-auto">
                    <span className="text-white font-medium drop-shadow-md text-sm bg-black/40 px-3 py-1 rounded-full">
                        {timeAgo(currentStatus.createdAt)}
                    </span>
                </div>

                <button onClick={onClose} className="absolute top-8 right-4 z-50 p-2 text-white bg-black/40 hover:bg-white/20 transition-colors rounded-full backdrop-blur-md cursor-pointer sm:max-w-md sm:mx-auto sm:right-auto sm:translate-x-[400px]">
                    <X size={20} />
                </button>

                {/* Media Container */}
                <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center sm:rounded-2xl overflow-hidden shadow-2xl" onClick={handleTap}>
                    {currentStatus.mediaType === 'video' ? (
                        <video 
                            ref={videoRef}
                            src={currentStatus.mediaUrl}
                            className="w-full h-full object-contain"
                            autoPlay
                            playsInline
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={handleVideoEnded}
                        />
                    ) : (
                        <img 
                            src={currentStatus.mediaUrl} 
                            className="w-full h-full object-contain"
                            alt="Status"
                        />
                    )}
                </div>

                {/* Bottom Bar: Reply or Views */}
                <div className="absolute bottom-4 left-4 right-4 z-50 flex justify-center sm:max-w-md sm:mx-auto">
                    {isMyStatus ? (
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowViews(true); }}
                                className="flex flex-col items-center gap-1 text-white hover:text-primary-300 transition-colors"
                            >
                                <ChevronUp size={20} className="animate-bounce" />
                                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full">
                                    <Eye size={18} />
                                    <span className="font-semibold text-sm">{currentStatus.views?.length || 0}</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleReply} onClick={e => e.stopPropagation()} className="w-full relative">
                            <input 
                                type="text"
                                placeholder="Reply..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 text-white placeholder-white/60 rounded-full px-5 py-3 pr-12 focus:outline-none focus:border-white/50 backdrop-blur-md transition-all"
                                onClick={(e) => {
                                    // Pause status when typing
                                    if (reqRef.current) cancelAnimationFrame(reqRef.current);
                                    if (videoRef.current) videoRef.current.pause();
                                }}
                                onBlur={() => {
                                    // Resume
                                    setShowViews(false); // Hack to trigger resume effect
                                }}
                            />
                            <button 
                                type="submit" 
                                disabled={!replyText.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-500 rounded-full text-white disabled:opacity-50 disabled:bg-white/20 transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    )}
                </div>

                {/* Views Modal (Bottom Sheet) */}
                <AnimatePresence>
                    {showViews && (
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 z-[60] bg-surface rounded-t-3xl sm:max-w-md sm:mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-border overflow-hidden flex flex-col supports-[height:60cqh]:h-[60cqh] supports-[height:60svh]:h-[60svh] h-[60vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-active">
                                <div className="flex items-center gap-2 text-text font-bold text-lg">
                                    <Eye size={20} className="text-primary-500" />
                                    Viewed by {currentStatus.views?.length || 0}
                                </div>
                                <button onClick={() => setShowViews(false)} className="p-2 bg-surface-hover rounded-full text-text-muted hover:text-text transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {currentStatus.views?.length > 0 ? (
                                    currentStatus.views.map((viewer, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 hover:bg-surface-hover rounded-xl transition-colors">
                                            <img src={viewer.avatar_url || `https://ui-avatars.com/api/?name=${viewer.display_name || viewer.username}&background=random`} alt={viewer.username} className="w-12 h-12 rounded-full object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-text truncate">{viewer.display_name || viewer.username}</div>
                                                <div className="text-xs text-text-muted">{timeAgo(viewer.viewed_at)}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60">
                                        <Eye size={48} className="mb-4" />
                                        <p>No views yet</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}

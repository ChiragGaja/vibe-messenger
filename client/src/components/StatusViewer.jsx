import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function StatusViewer({ statuses, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const reqRef = useRef(null);
    const startTimeRef = useRef(null);
    const currentDurationRef = useRef(5000); // 5s for images

    const currentStatus = statuses[currentIndex];

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

        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [currentIndex, currentStatus]);

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
            </motion.div>
        </AnimatePresence>
    );
}

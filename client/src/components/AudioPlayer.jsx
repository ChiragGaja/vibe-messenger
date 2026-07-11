import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export default function AudioPlayer({ src }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleLoadedMetadata = () => {
            if (audio.duration === Infinity || isNaN(audio.duration)) {
                audio.currentTime = 1e101;
                audio.ontimeupdate = () => {
                    audio.ontimeupdate = () => { };
                    audio.currentTime = 0;
                    setDuration(audio.duration);
                }
            } else {
                setDuration(audio.duration);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        audioRef.current.currentTime = percent * audioRef.current.duration;
        setProgress(percent * 100);
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 w-full min-w-[200px] max-w-[250px] pt-1">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 text-white shadow-md shadow-primary-500/20 hover:scale-105 transition-transform shrink-0"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div
                    className="h-6 flex items-end gap-0.5 cursor-pointer relative"
                    onClick={handleSeek}
                >
                    {/* Simulated Waveform generated dynamically */}
                    {[...Array(30)].map((_, i) => {
                        const height = Math.random() * 80 + 20; // 20% to 100% height
                        const isPlayed = (i / 30) * 100 <= progress;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors ${isPlayed ? 'bg-primary-500' : 'bg-primary-500/20'}`}
                                style={{ height: `${height}%` }}
                            />
                        )
                    })}
                </div>

                <div className="flex justify-between items-center text-[10px] text-text-muted font-medium w-full">
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}

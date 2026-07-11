import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, Ear } from 'lucide-react';
import useCallStore from '../store/callStore';
import { getSocket } from '../socket/socket';
import useChatStore from '../store/chatStore';

export default function CallWindow() {
    const {
        callStatus,
        localStream,
        remoteStream,
        endCall,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        callerData // In an outgoing call, we might not have callerData but rather the activeChat details. We'll handle this cleanly.
    } = useCallStore();

    const { activeChat, user } = useChatStore();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isSpeaker, setIsSpeaker] = useState(true);
    const [canSwitchAudio, setCanSwitchAudio] = useState(false);

    useEffect(() => {
        // Check if browser supports audio output selection
        if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                if (audioOutputs.length > 1) {
                    setCanSwitchAudio(true);
                }
            }).catch(console.error);
        }
    }, [remoteStream]);

    const toggleAudioOutput = async () => {
        if (!remoteVideoRef.current || typeof remoteVideoRef.current.setSinkId !== 'function') return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
            if (audioOutputs.length > 1) {
                const currentId = remoteVideoRef.current.sinkId || audioOutputs[0].deviceId;
                const nextDevice = audioOutputs.find(d => d.deviceId !== currentId && d.deviceId !== 'default') || audioOutputs[0];
                await remoteVideoRef.current.setSinkId(nextDevice.deviceId);
                setIsSpeaker(!isSpeaker);
            }
        } catch (err) {
            console.error("Error switching audio output:", err);
            alert("Could not switch audio output device.");
        }
    };

    // Play local stream immediately when available
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.log('Local play interrupted', e));
        }
    }, [localStream]);

    // Play remote stream immediately when available
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.log('Remote play interrupted', e));
        }
    }, [remoteStream]);

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            endCall();
        };
    }, []);

    const handleHangUp = () => {
        const socket = getSocket();
        // If we have callerData, it was an incoming call. If not, we are calling the activeChat user.
        const targetUsername = callerData ? callerData.callerUsername : activeChat?.username;
        if (targetUsername) {
            socket.emit('end_call', { toUsername: targetUsername });
        }
        endCall();
    };

    if (callStatus === 'idle' || callStatus === 'ringing') return null;

    // Determine who we are talking to
    const displayName = callerData?.callerName || activeChat?.display_name || callerData?.callerUsername || activeChat?.username || 'Unknown';
    const avatar = callerData?.callerAvatar || activeChat?.avatar_url;
    const isAudioOnly = !localStream?.getVideoTracks().length && !remoteStream?.getVideoTracks().length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-8 backdrop-blur-3xl pointer-events-auto"
            >
                {/* Header Info */}
                <div className="absolute top-8 left-0 w-full flex flex-col items-center z-10 drop-shadow-lg">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{displayName}</h2>
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                        {callStatus === 'calling' && (
                            <>
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-emerald-100">Calling...</span>
                            </>
                        )}
                        {callStatus === 'connected' && (
                            <>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-emerald-100 font-mono">Connected</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Video / Audio Area */}
                <div className="relative w-full max-w-5xl aspect-video bg-black/40 rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center mt-12 sm:mt-0">

                    {/* Remote Stream (Main view) */}
                    {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        // Audio-only or Waiting for stream UI
                        <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-indigo-500/20 to-primary-500/20 flex items-center justify-center p-2 relative">
                            {/* Pulse orbits */}
                            {callStatus === 'calling' && (
                                <>
                                    <div className="absolute inset-0 border-2 border-primary-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                    <div className="absolute inset-4 border border-indigo-500/30 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                                </>
                            )}
                            {callStatus === 'connected' && remoteStream && (
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse" />
                            )}

                            <div className="w-full h-full rounded-full bg-surface-hover/80 overflow-hidden flex items-center justify-center border-4 border-surface shadow-xl z-10 backdrop-blur-sm">
                                {avatar ? (
                                    <img src={avatar} alt={displayName} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <span className="text-6xl sm:text-8xl font-bold text-white opacity-50">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* We still need to attach the remote audio track even if there's no video element. 
                                We can just make the video element hidden but autoPlay. */}
                            {remoteStream && (
                                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                            )}
                        </div>
                    )}

                    {/* Local Stream (Picture in Picture) */}
                    <div className="absolute bottom-6 right-6 w-32 sm:w-48 aspect-[3/4] sm:aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-xl border border-white/10 flex items-center justify-center transition-all hover:scale-105 cursor-pointer">
                        {localStream && localStream.getVideoTracks()?.length > 0 && !isVideoOff ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted // ALWAYS MUTE LOCAL IN PIP TO AVOID FEEDBACK
                                className="w-full h-full object-cover scale-x-[-1]" // Mirror local video
                            />
                        ) : (
                            <div className="w-full h-full bg-surface-hover flex items-center justify-center flex-col gap-2">
                                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                                    <span className="text-xl font-bold text-primary-400">
                                        {user?.username?.[0].toUpperCase()}
                                    </span>
                                </div>
                                {isVideoOff && <VideoOff size={16} className="text-text-muted" />}
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur text-[10px] px-2 py-0.5 rounded text-white mix-blend-screen">You</div>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-surface/80 backdrop-blur-xl px-6 py-4 rounded-full border border-white/10 shadow-[0_20px_40px_rgb(0,0,0,0.4)]">
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-surface hover:bg-surface-hover text-text'}`}
                        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    {canSwitchAudio && (
                        <button
                            onClick={toggleAudioOutput}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-surface hover:bg-surface-hover text-text`}
                            title={isSpeaker ? 'Switch to Earpiece' : 'Switch to Speaker'}
                        >
                            {isSpeaker ? <Volume2 size={24} /> : <Ear size={24} />}
                        </button>
                    )}

                    {!isAudioOnly && (
                        <button
                            onClick={toggleVideo}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-surface hover:bg-surface-hover text-text'}`}
                            title={isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
                        >
                            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                        </button>
                    )}

                    <button
                        onClick={handleHangUp}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                        title="End Call"
                    >
                        <PhoneOff size={28} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

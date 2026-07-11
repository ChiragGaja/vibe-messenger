import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import useCallStore from '../store/callStore';
import { getSocket } from '../socket/socket';

export default function IncomingCallDialog() {
    const { isReceivingCall, callerData, endCall, setCallStatus, setPeerInstance, setLocalStream, setRemoteStream } = useCallStore();

    if (!isReceivingCall || !callerData || useCallStore.getState().callStatus !== 'ringing') return null;

    const acceptCall = async (withVideo) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: withVideo,
                audio: true,
            });
            setLocalStream(stream);

            // Import dynamically because simple-peer needs window/global polyfills which might cause issues during initial load in some Vite setups
            const Peer = (await import('simple-peer')).default;
            const socket = getSocket();

            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: stream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('signal', (data) => {
                socket.emit('call_accepted', {
                    signal: data,
                    callerUsername: callerData.callerUsername
                });
            });

            peer.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
            });

            peer.signal(callerData.signal);

            setPeerInstance(peer);
            setCallStatus('connected');

        } catch (err) {
            console.error('Failed to access media devices', err);
            alert('Could not access microphone/camera properly.');
            rejectCall();
        }
    };

    const rejectCall = () => {
        const socket = getSocket();
        socket.emit('call_rejected', { callerUsername: callerData.callerUsername });
        endCall();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                className="bg-surface border border-border rounded-3xl p-6 flex flex-col items-center gap-6 shadow-[0_20px_60px_rgb(0,0,0,0.5)] w-80 relative overflow-hidden"
            >
                {/* Ringing Animation Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary-500/10 rounded-full blur-xl animate-ping" style={{ animationDuration: '2s' }} />

                <div className="flex flex-col items-center gap-2 relative z-10 w-full mt-4">
                    <div className="w-24 h-24 rounded-full bg-surface-hover border border-border flex items-center justify-center p-1 shadow-none">
                        <div className="w-full h-full rounded-full bg-surface-hover overflow-hidden flex items-center justify-center">
                            {callerData.callerAvatar ? (
                                <img src={callerData.callerAvatar} alt={callerData.callerUsername} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-text">
                                    {(callerData.callerName?.[0] || callerData.callerUsername[0]).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-text mt-2">{callerData.callerName || callerData.callerUsername}</h2>
                    <p className="text-sm text-text-muted font-medium animate-pulse">
                        Incoming {callerData.isVideo ? 'Video' : 'Audio'} Call...
                    </p>
                </div>

                <div className="flex items-center gap-6 w-full justify-center mt-2 relative z-10">
                    <button
                        onClick={rejectCall}
                        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all shadow-lg shadow-red-500/30"
                    >
                        <PhoneOff size={24} />
                    </button>

                    {!callerData.isVideo ? (
                        <button
                            onClick={() => acceptCall(false)}
                            className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 hover:scale-105 transition-all shadow-lg shadow-emerald-500/30"
                        >
                            <Phone size={24} className="animate-wiggle" />
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            <button
                                onClick={() => acceptCall(false)}
                                className="w-12 h-12 rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/10 transition-all hover:scale-105"
                                title="Answer as Audio"
                            >
                                <Phone size={20} />
                            </button>
                            <button
                                onClick={() => acceptCall(true)}
                                className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 hover:scale-105 transition-all shadow-lg shadow-emerald-500/30"
                                title="Answer as Video"
                            >
                                <Video size={24} className="animate-pulse" />
                            </button>
                        </div>
                    )}
                </div>

                <audio autoPlay loop src="/audio/ringtone.mp3" className="hidden" />
            </motion.div>
        </div>
    );
}

import { create } from 'zustand';

const useCallStore = create((set, get) => ({
    localStream: null,
    remoteStream: null,
    callStatus: 'idle', // 'idle' | 'ringing' | 'calling' | 'connected'
    isReceivingCall: false,
    callerData: null,
    peerInstance: null,
    isMuted: false,
    isVideoOff: false,

    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),

    setCallStatus: (status) => set({ callStatus: status }),

    setIncomingCall: (caller) => set({
        isReceivingCall: true,
        callerData: caller,
        callStatus: 'ringing'
    }),

    setPeerInstance: (peer) => set({ peerInstance: peer }),

    toggleMute: () => set((state) => {
        if (state.localStream) {
            state.localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        }
        return { isMuted: !state.isMuted };
    }),

    toggleVideo: () => set((state) => {
        if (state.localStream) {
            state.localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        }
        return { isVideoOff: !state.isVideoOff };
    }),

    endCall: () => {
        const { localStream, peerInstance } = get();
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerInstance) {
            peerInstance.destroy();
        }
        set({
            localStream: null,
            remoteStream: null,
            callStatus: 'idle',
            isReceivingCall: false,
            callerData: null,
            peerInstance: null,
            isMuted: false,
            isVideoOff: false
        });
    }
}));

export default useCallStore;

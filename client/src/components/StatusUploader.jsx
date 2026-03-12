import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Check, Video, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

export default function StatusUploader({ onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isVideo, setIsVideo] = useState(false);
    const [duration, setDuration] = useState(0);
    const [startOffset, setStartOffset] = useState(0);
    const [endOffset, setEndOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);

    const handleFile = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        const url = URL.createObjectURL(selected);
        setPreview(url);
        setIsVideo(selected.type.startsWith('video/'));
    };

    const handleVideoMetaData = () => {
        if (!videoRef.current) return;
        const d = videoRef.current.duration;
        setDuration(d);
        if (d > 30) {
            setStartOffset(0);
            setEndOffset(30);
        } else {
            setStartOffset(0);
            setEndOffset(d);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const formData = new FormData();
            
            // Text fields must be appended before files in Multer
            if (isVideo && duration > 30) {
                formData.append('startOffset', startOffset);
                formData.append('duration', endOffset - startOffset);
            }
            formData.append('media', file);

            await api.post('/status', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (onUploaded) onUploaded();
            onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
            alert(`Upload failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-border/50">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface-active">
                    <h2 className="text-lg font-bold text-text">New Status</h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg text-text-muted transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-4 flex-1 flex flex-col min-h-[350px]">
                    {!file ? (
                        <div className="flex-1 border-2 border-dashed border-border hover:border-primary-500 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:bg-surface-hover transition-all group">
                            <div className="flex gap-4 mb-4">
                                <ImageIcon className="text-primary-500/70 group-hover:text-primary-500 transition-colors" size={36} />
                                <Video className="text-primary-500/70 group-hover:text-primary-500 transition-colors" size={36} />
                            </div>
                            <p className="font-bold text-text text-lg">Select Media</p>
                            <p className="text-xs text-text-muted mt-1 font-medium">Photos or Videos (Max 30s)</p>
                            <input type="file" accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFile} />
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1">
                            <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center min-h-[300px] border border-border shadow-inner">
                                {isVideo ? (
                                    <video ref={videoRef} src={preview} onLoadedMetadata={handleVideoMetaData} autoPlay loop muted playsInline className="max-w-full max-h-[350px] object-contain" />
                                ) : (
                                    <img src={preview} className="max-w-full max-h-[350px] object-contain" />
                                )}
                            </div>
                            
                            {/* Trimmer UI */}
                            {isVideo && duration > 30 && (
                                <div className="mt-4 bg-surface-hover p-4 rounded-xl border border-border relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                    <p className="text-xs font-bold text-text mb-3 text-center text-red-400">Video exceeds 30s. Drag to choose a 30s clip.</p>
                                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-text-muted justify-between uppercase tracking-wider">
                                        <span>Start: {Math.floor(startOffset)}s</span>
                                        <span>End: {Math.floor(endOffset)}s</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={0} 
                                        max={Math.max(0, duration - 30)} 
                                        value={startOffset} 
                                        step={1}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setStartOffset(val);
                                            setEndOffset(Math.min(val + 30, duration));
                                            if (videoRef.current) {
                                                videoRef.current.currentTime = val;
                                            }
                                        }}
                                        className="w-full accent-primary-500 cursor-grab active:cursor-grabbing" 
                                    />
                                </div>
                            )}
                            
                            <button onClick={handleUpload} disabled={loading} className="mt-4 btn-primary py-3 w-full shadow-lg flex items-center justify-center gap-2">
                                {loading ? <span className="spinner w-5 h-5 border-white border-t-transparent" /> : <><Check size={18}/> Share Status</>}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

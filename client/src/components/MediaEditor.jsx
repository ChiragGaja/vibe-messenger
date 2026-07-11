import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sun, Contrast, Maximize, Crop as CropIcon, Trash2, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

const ASPECT_RATIOS = [
    { label: 'Custom', value: null },
    { label: '1:1', value: 1 / 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
];

export default function MediaEditor({ initialFiles, onComplete, onCancel }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fileStates, setFileStates] = useState(
        initialFiles.map(file => ({
            file,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            url: URL.createObjectURL(file), // Generate explicitly on mount
            crop: { x: 0, y: 0 },
            zoom: 1,
            aspect: null,
            croppedAreaPixels: null,
            brightness: 100,
            contrast: 100,
            exposure: 100,
            saturation: 100,
        }))
    );
    const [isHD, setIsHD] = useState(false);
    const [processing, setProcessing] = useState(false);

    const currentMedia = fileStates[currentIndex];

    const onCropChange = (crop) => {
        updateCurrentFileState({ crop });
    };

    const onZoomChange = (zoom) => {
        updateCurrentFileState({ zoom });
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        updateCurrentFileState({ croppedAreaPixels });
    }, [currentIndex]);

    const updateCurrentFileState = (updates) => {
        setFileStates(prev => prev.map((state, i) => 
            i === currentIndex ? { ...state, ...updates } : state
        ));
    };

    const handleSend = async () => {
        setProcessing(true);
        try {
            const processedFiles = await Promise.all(
                fileStates.map(async (state) => {
                    if (state.type === 'video') return state.file;
                    return await getEditedImage(state);
                })
            );
            onComplete(processedFiles, isHD);
        } catch (err) {
            console.error('Processing failed:', err);
            alert('Failed to process images. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // --- Image Processing Utility ---
    const getEditedImage = (state) => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = state.url;
            if (!state.url.startsWith('blob:')) {
                image.crossOrigin = 'anonymous';
            }
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const { croppedAreaPixels } = state;
                if (!croppedAreaPixels) {
                    resolve(state.file);
                    return;
                }

                canvas.width = croppedAreaPixels.width;
                canvas.height = croppedAreaPixels.height;

                // Apply Filters
                // Exposure is complex, we simulate with brightness + contrast adjustments
                const b = state.brightness / 100;
                const c = state.contrast / 100;
                const e = state.exposure / 100;
                const s = state.saturation / 100;

                ctx.filter = `brightness(${b * e}) contrast(${c}) saturate(${s})`;

                ctx.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }
                    const editedFile = new File([blob], state.file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(editedFile);
                }, 'image/jpeg', isHD ? 1.0 : 0.82);
            };
            image.onerror = (err) => reject(err);
        });
    };

    const removeCurrentFile = () => {
        if (fileStates.length === 1) {
            onCancel();
            return;
        }
        const newStates = fileStates.filter((_, i) => i !== currentIndex);
        setFileStates(newStates);
        setCurrentIndex(Math.max(0, currentIndex - 1));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-3xl flex flex-col text-white select-none"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                    <h2 className="text-lg font-bold text-white">
                        Edit Media
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsHD(!isHD)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isHD ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                    >
                        <Zap size={14} fill={isHD ? "currentColor" : "none"} />
                        <span className="text-xs font-bold tracking-wider">HD QUALITY</span>
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={processing}
                        className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xl shadow-white/10"
                    >
                        {processing ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <X size={16} className="rotate-45" />}
                        {processing ? 'Processing...' : 'Done'}
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Editor/Preview View */}
                <div className="flex-1 relative bg-black/40 flex items-center justify-center overflow-hidden">
                    {currentMedia?.url && (
                        currentMedia.type === 'image' ? (
                            <div className="absolute inset-0 bg-zinc-900 border border-transparent">
                                <Cropper
                                    image={currentMedia.url} 
                                    crop={currentMedia.crop}
                                    zoom={currentMedia.zoom}
                                    aspect={currentMedia.aspect}
                                    onCropChange={onCropChange}
                                    onZoomChange={onZoomChange}
                                    onCropComplete={onCropComplete}
                                    style={{
                                        containerStyle: { backgroundColor: '#09090b', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%' },
                                        mediaStyle: {
                                            filter: `brightness(${currentMedia.brightness / 100 * (currentMedia.exposure / 100)}) contrast(${currentMedia.contrast / 100}) saturate(${currentMedia.saturation / 100})`
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <video src={currentMedia.url} controls className="max-w-[80%] max-h-[80%] rounded-2xl shadow-2xl" />
                        )
                    )}

                    {/* Navigation Arrows */}
                    {fileStates.length > 1 && (
                        <>
                            <button
                                onClick={() => setCurrentIndex(prev => (prev - 1 + fileStates.length) % fileStates.length)}
                                className="absolute left-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(prev => (prev + 1) % fileStates.length)}
                                className="absolute right-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}
                </div>

                {/* Sidebar Controls (Photos Only) */}
                {currentMedia.type === 'image' && (
                    <div className="w-full md:w-80 bg-[#18181b] border-l border-white/10 flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-8">
                            {/* Aspect Ratio */}
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4 block">Aspect Ratio</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ASPECT_RATIOS.map(ratio => (
                                        <button
                                            key={ratio.label}
                                            onClick={() => updateCurrentFileState({ aspect: ratio.value })}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${currentMedia.aspect === ratio.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Adjustments */}
                            <div className="space-y-6">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Adjustments</label>
                                
                                <AdjustmentSlider
                                    icon={<Sun size={14} />}
                                    label="Brightness"
                                    value={currentMedia.brightness}
                                    min={50} max={150}
                                    onChange={(v) => updateCurrentFileState({ brightness: v })}
                                />

                                <AdjustmentSlider
                                    icon={<Contrast size={14} />}
                                    label="Contrast"
                                    value={currentMedia.contrast}
                                    min={50} max={150}
                                    onChange={(v) => updateCurrentFileState({ contrast: v })}
                                />

                                <AdjustmentSlider
                                    icon={<Zap size={14} />}
                                    label="Exposure"
                                    value={currentMedia.exposure}
                                    min={50} max={150}
                                    onChange={(v) => updateCurrentFileState({ exposure: v })}
                                />

                                <AdjustmentSlider
                                    icon={<Maximize size={14} />}
                                    label="Saturation"
                                    value={currentMedia.saturation}
                                    min={0} max={200}
                                    onChange={(v) => updateCurrentFileState({ saturation: v })}
                                />
                            </div>

                            <button
                                onClick={removeCurrentFile}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/30 text-xs font-bold uppercase tracking-wider"
                            >
                                <Trash2 size={14} /> Remove File
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Thumbnails Footer */}
            <div className="h-28 border-t border-white/10 bg-[#09090b] flex items-center px-6 gap-3 overflow-x-auto scrollbar-hide mb-2">
                {fileStates.map((state, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${currentIndex === i ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                        {state.type === 'image' ? (
                            state.url && <img src={state.url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/50 flex items-center justify-center">
                                    <ChevronRight size={12} fill="white" />
                                </div>
                            </div>
                        )}
                        {i === currentIndex && (
                            <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                        )}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

function AdjustmentSlider({ icon, label, value, min, max, onChange }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-2 text-xs font-medium">
                    {icon} <span>{label}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{Math.round((value / 100) * 100)}%</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-emerald-400 transition-colors"
            />
        </div>
    );
}

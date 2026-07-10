import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Send, X, FileText, Reply, Mic, Square, Trash2, Smile } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { getSocket } from '../socket/socket';
import api from '../api/axios';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import MediaEditor from './MediaEditor';

// ─── Image Compression Helper ────────────────────────────
const compressImage = (file, maxWidth = 1280, quality = 0.8) => {
    return new Promise((resolve) => {
        // Skip non-images or GIFs (animated)
        if (!file.type.startsWith('image/') || file.type === 'image/gif') {
            resolve(file);
            return;
        }
        // Skip small files (< 500KB)
        if (file.size < 512000) {
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        const compressed = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressed);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

export default function MessageInput() {
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isHD, setIsHD] = useState(false);
    const [pendingFiles, setPendingFiles] = useState(null); // Files awaiting editor

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const { activeChat, addMessage, replyTo, clearReplyTo, user } = useChatStore();

    // Emoji Picker State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const handleEmojiSelect = (emoji) => {
        setText((prev) => prev + emoji.native);
        inputRef.current?.focus();
    };

    // Mentions State
    const [mentionQuery, setMentionQuery] = useState(null);
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(null);

    const handleTyping = useCallback(() => {
        const socket = getSocket();
        if (!socket || !activeChat) return;
        socket.emit('typing', { recipientUsername: activeChat.username });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { recipientUsername: activeChat.username });
        }, 2000);
    }, [activeChat]);

    // ─── Audio Recording Logic ──────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Clean up tracks
                stream.getTracks().forEach(track => track.stop());

                // Set as file to be uploaded
                const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
                setFiles([audioFile]);
                setFilePreviews([{ id: 'audio_placeholder', type: 'audio', name: audioFile.name, size: audioFile.size }]);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start Timer
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Microphone access is required to send voice notes.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // We clear the chunks immediately so onstop creates an empty blob or we just ignore it
            audioChunksRef.current = [];
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            setFiles([]);
            setFilePreviews([]);
        }
    };

    const formatRecordingTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    // ────────────────────────────────────────────────────────

    const handleFileSelect = async (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length === 0) return;
        setPendingFiles(selected);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEditorComplete = async (processedFiles, hdStatus) => {
        setIsHD(hdStatus);
        setPendingFiles(null);

        // Append new files to existing ones (max 10)
        const combinedFiles = [...files, ...processedFiles].slice(0, 10);
        setFiles(combinedFiles);

        // Generate previews
        const newPreviews = [...filePreviews];

        processedFiles.forEach((f) => {
            if (f.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    newPreviews.push({ id: URL.createObjectURL(f), url: ev.target.result, type: 'image', name: f.name, size: f.size });
                    setFilePreviews([...newPreviews].slice(0, 10));
                };
                reader.readAsDataURL(f);
            } else {
                newPreviews.push({ id: Math.random().toString(), url: null, type: f.type, name: f.name, size: f.size });
                setFilePreviews([...newPreviews].slice(0, 10));
            }
        });
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, i) => i !== indexToRemove));
        setFilePreviews(filePreviews.filter((_, i) => i !== indexToRemove));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        handleTyping();

        if (activeChat?.is_group && activeChat?.members) {
            const cursorStart = e.target.selectionStart;
            const textBeforeCursor = val.slice(0, cursorStart);
            const match = textBeforeCursor.match(/@(\w*)$/);

            if (match) {
                setMentionQuery(match[1]);
                setShowMentions(true);
                setCursorPosition(cursorStart - match[1].length - 1);
            } else {
                setShowMentions(false);
                setMentionQuery(null);
            }
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (username) => {
        if (cursorPosition !== null) {
            const before = text.slice(0, cursorPosition);
            const afterMatchIndex = cursorPosition + 1 + (mentionQuery || '').length;
            const after = text.slice(afterMatchIndex);
            setText(`${before}@${username} ${after}`);
        }
        setShowMentions(false);
        setMentionQuery(null);
        setTimeout(() => inputRef.current?.focus(), 10);
    };

    const handleSend = async () => {
        const socket = getSocket();
        if (!socket || !activeChat) return;
        if (!text.trim() && files.length === 0) return;

        socket.emit('stop_typing', { recipientUsername: activeChat.username });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const replyToId = replyTo?.id || null;
        clearReplyTo();

        if (!navigator.onLine) {
            if (files.length > 0) {
                alert("Cannot send files while offline.");
                return;
            }
            
            const user = useChatStore.getState().user;
            const pendingMsg = {
                tempId: 'pending_' + Date.now().toString(),
                sender_username: user.username,
                sender_id: user.id,
                group_id: activeChat.is_group ? activeChat.id : null,
                recipientUsername: activeChat.is_group ? null : activeChat.username, // custom field for later sync
                content: text.trim(),
                message_type: 'text',
                created_at: new Date().toISOString(),
                status: 'pending', // Special status
                reply_to_id: replyToId,
            };
            useChatStore.getState().addPendingMessage(pendingMsg);
            setText('');
            return;
        }

        if (files.length > 0) {
            setUploading(true);
            setUploadProgress(0);
            try {
                const formData = new FormData();
                files.forEach(f => formData.append('files', f)); // Expect backend to handle 'files' array

                const { data: uploadData } = await api.post('/messages/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
                });

                // Assuming backend returns arrays for multi-upload
                socket.emit('send_message', {
                    recipientUsername: activeChat.is_group ? null : activeChat.username,
                    groupId: activeChat.is_group ? activeChat.id : null,
                    content: text.trim() || null,
                    messageType: files.length === 1 && files[0].type.startsWith('audio/') ? 'audio' : 'multi',
                    fileUrls: uploadData.fileUrls,
                    fileNames: uploadData.fileNames,
                    fileSizes: uploadData.fileSizes,
                    replyToId,
                    isHD,
                }, (res) => { if (res?.success) addMessage(res.message); });

                setFiles([]);
                setFilePreviews([]);
            } catch (err) {
                console.error('Upload failed:', err);
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        } else {
            socket.emit('send_message', {
                recipientUsername: activeChat.is_group ? null : activeChat.username,
                groupId: activeChat.is_group ? activeChat.id : null,
                content: text.trim(),
                messageType: 'text',
                replyToId,
            }, (res) => { if (res?.success) addMessage(res.message); });
        }
        setText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = (text.trim() || files.length > 0) && !uploading;

    return (
        <div className="px-5 py-3 border-t border-border bg-surface">
            {/* Reply Preview */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                            <div className="w-1 h-8 bg-primary-500 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold text-primary-400 flex items-center gap-1">
                                    <Reply size={10} /> Replying to {replyTo.senderUsername || replyTo.sender_username}
                                </div>
                                <div className="text-xs text-text-muted truncate">{replyTo.content || `[${replyTo.messageType || replyTo.message_type}]`}</div>
                            </div>
                            <button onClick={clearReplyTo} className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0">
                                <X size={12} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* File Previews Grid */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 items-center">
                            {filePreviews.map((preview, index) => (
                                <div key={index} className="relative group shrink-0 w-16 h-16 rounded-xl border border-border bg-surface-hover flex flex-col items-center justify-center overflow-hidden">
                                    {preview.id === 'audio_placeholder' ? (
                                        <Mic size={24} className="text-emerald-500" />
                                    ) : preview.type === 'image' ? (
                                        <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <FileText size={24} className="text-primary-400" />
                                    )}
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            {/* Option to add more files directly */}
                            {files.length > 0 && files.length < 10 && !isRecording && (
                                <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-text-muted hover:border-primary-500 hover:text-primary-500 transition-colors">
                                    <Paperclip size={20} />
                                </button>
                            )}
                        </div>
                        {uploading && (
                            <div className="h-1 bg-border rounded-full overflow-hidden mb-1">
                                <motion.div className="h-full bg-primary-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mentions Popover */}
            <AnimatePresence>
                {showMentions && activeChat?.members && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-[70px] left-5 mb-2 w-64 bg-surface border border-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden z-50 backdrop-blur-md bg-surface/90"
                    >
                        <div className="max-h-48 overflow-y-auto overflow-x-hidden scrollbar-thin">
                            {activeChat.members
                                .filter(m => m.id !== user.id)
                                .filter(m => m.username.toLowerCase().includes(mentionQuery?.toLowerCase() || '') ||
                                    (m.display_name && m.display_name.toLowerCase().includes(mentionQuery?.toLowerCase() || '')))
                                .map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => insertMention(member.username)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-surface-hover flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden shrink-0 shadow-sm border border-border/50">
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                                            ) : (
                                                (member.display_name?.charAt(0) || member.username.charAt(0)).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-text truncate">{member.display_name || member.username}</div>
                                            <div className="text-[10px] text-primary-400 font-medium truncate">@{member.username}</div>
                                        </div>
                                    </button>
                                ))}
                            {activeChat.members.filter(m => m.id !== user.id).filter(m => m.username.toLowerCase().includes(mentionQuery?.toLowerCase() || '') || (m.display_name && m.display_name.toLowerCase().includes(mentionQuery?.toLowerCase() || ''))).length === 0 && (
                                <div className="px-4 py-4 text-xs text-text-muted text-center flex flex-col items-center gap-2">
                                    <span className="text-2xl opacity-50">🔍</span>
                                    No members found matching "{mentionQuery}"
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Row */}
            <div className="flex items-end gap-2 relative z-10">
                {isRecording ? (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ opacity: [1, 0.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-2.5 h-2.5 rounded-full bg-red-500"
                            />
                            <span className="text-sm font-medium text-red-500 font-mono">
                                {formatRecordingTime(recordingTime)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={cancelRecording}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                onClick={stopRecording}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:text-primary-400 hover:bg-surface-hover transition-all flex-shrink-0"
                            title="Attach file"
                        >
                            <Paperclip size={18} />
                        </button>
                        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip,.rar" />

                        {/* Emoji Picker Button */}
                        <div className="relative" ref={emojiPickerRef}>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${showEmojiPicker ? 'text-primary-400 bg-primary-500/10' : 'text-text-muted hover:text-primary-400 hover:bg-surface-hover'}`}
                                title="Emoji"
                            >
                                <Smile size={18} />
                            </button>
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50"
                                    >
                                        <Picker
                                            data={data}
                                            onEmojiSelect={handleEmojiSelect}
                                            theme="dark"
                                            previewPosition="none"
                                            skinTonePosition="none"
                                            maxFrequentRows={2}
                                            perLine={8}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex-1 bg-surface-hover border border-transparent rounded-xl px-4 py-2.5 focus-within:bg-background focus-within:border-border transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a message..."
                                value={text}
                                onChange={handleTextChange}
                                onKeyDown={handleKeyDown}
                                disabled={uploading}
                                className="w-full bg-transparent border-none outline-none text-sm text-text placeholder-text-muted"
                            />
                        </div>
                    </>
                )}

                {text.trim() || files.length > 0 ? (
                    <motion.button
                        onClick={handleSend}
                        disabled={!canSend}
                        whileTap={{ scale: 0.9 }}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0
                ${canSend
                                ? 'bg-text text-background hover:opacity-90'
                                : 'bg-surface text-text-muted cursor-not-allowed'}`}
                    >
                        <Send size={16} />
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={isRecording ? stopRecording : startRecording}
                        whileTap={{ scale: 0.9 }}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0
                            ${isRecording
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                : 'bg-surface text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                    >
                        <Mic size={18} />
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {pendingFiles && (
                    <MediaEditor
                        initialFiles={pendingFiles}
                        onComplete={handleEditorComplete}
                        onCancel={() => setPendingFiles(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

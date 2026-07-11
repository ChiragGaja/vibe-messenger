import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, FileText, Download, Reply, Forward, Pencil, Trash2, SmilePlus, X, CornerUpRight, Play, Star, Clock } from 'lucide-react';
import useChatStore from '../store/chatStore';
import api from '../api/axios';
import { getSocket } from '../socket/socket';
import AudioPlayer from './AudioPlayer';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessageBubble({ message, isOwn }) {
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isStarred, setIsStarred] = useState(message.isStarred || false);
    const [swipeX, setSwipeX] = useState(0);
    const { setReplyTo, user, activeChat } = useChatStore();

    const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const status = message.status;
    const StatusIcon = () => {
        if (!isOwn) return null;

        // Single Tick (Sent)
        const Tick = ({ className }) => (
            <svg viewBox="0 0 16 15" width="16" height="15" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4L5.5 13.5L1 9" />
            </svg>
        );

        // Double Tick (Delivered / Read)
        const DoubleTick = ({ className }) => (
            <svg viewBox="0 0 16 15" width="16" height="15" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4L5.5 13.5L1 9" />
                <path d="M10.5 4L7.5 7" />
            </svg>
        );

        if (status === 'pending') return <Clock size={12} className="text-orange-400 ml-0.5" />;
        if (status === 'read') return <DoubleTick className="text-[#53bdeb] ml-0.5" />;
        if (status === 'delivered') return <DoubleTick className="text-text-muted/80 ml-0.5" />;
        return <Tick className="text-text-muted/80 ml-0.5" />;
    };

    // Handle deleted messages
    if (message.is_deleted) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`max-w-[65%] px-3.5 py-2 italic text-xs text-text-muted ${isOwn ? 'self-end' : 'self-start'}`}
            >
                🚫 This message was deleted
            </motion.div>
        );
    }

    const type = message.messageType || message.message_type;
    const fileUrl = message.fileUrl || message.file_url;
    const fileName = message.fileName || message.file_name;
    const fileSize = message.fileSize || message.file_size;

    // Arrays for multi-media messages
    const fileUrls = message.fileUrls || message.file_urls || [];
    const fileNames = message.fileNames || message.file_names || [];
    const fileSizes = message.fileSizes || message.file_sizes || [];
    const replyTo = message.replyTo;
    const reactions = message.reactions || [];
    const isEdited = message.is_edited || message.isEdited;
    const isForwarded = message.is_forwarded || message.isForwarded;
    const originalSender = message.original_sender || message.originalSender;

    // Link Preview Data
    const linkTitle = message.linkTitle || message.link_title;
    const linkDescription = message.linkDescription || message.link_description;
    const linkImage = message.linkImage || message.link_image;
    const linkUrl = message.linkUrl || message.link_url;

    // Build Slides for Lightbox
    const mediaUrls = fileUrls.length > 0 ? fileUrls : [fileUrl].filter(Boolean);
    const slides = mediaUrls.map(url => {
        if (!url) return null;
        if (url.match(/\.(mp4|webm|mov)$/i)) {
            return { type: 'video', width: 1280, height: 720, sources: [{ src: url, type: 'video/mp4' }] };
        }
        return { src: url };
    }).filter(Boolean);

    // ─── Actions ────────────────────────────────────────
    const handleReply = () => {
        setReplyTo(message);
        setShowActions(false);
    };

    // ─── Swipe-to-Reply Logic (Framer Motion Native) ────
    const SWIPE_THRESHOLD = 60;
    
    const handleDragEnd = (event, info) => {
        if (info.offset.x >= SWIPE_THRESHOLD) {
            handleReply();
            if (navigator.vibrate) navigator.vibrate(30);
        }
        setSwipeX(0);
    };

    const handleDrag = (event, info) => {
        setSwipeX(Math.max(0, info.offset.x));
    };

    const handleEdit = () => {
        setEditText(message.content || '');
        setEditing(true);
        setShowActions(false);
        setTimeout(() => editRef.current?.focus(), 50);
    };

    const submitEdit = () => {
        const socket = getSocket();
        if (socket && editText.trim()) {
            socket.emit('edit_message', { messageId: message.id, newContent: editText.trim() }, (res) => {
                if (res?.success) {
                    useChatStore.getState().editMessage(message.id, editText.trim());
                }
            });
        }
        setEditing(false);
    };

    const handleDelete = () => {
        const socket = getSocket();
        if (socket) {
            socket.emit('delete_message', { messageId: message.id }, (res) => {
                if (res?.success) {
                    useChatStore.getState().deleteMessage(message.id);
                }
            });
        }
        setShowActions(false);
    };

    const handleStar = async () => {
        try {
            const res = await api.post(`/messages/${message.id}/star`);
            setIsStarred(res.data.isStarred);
        } catch (error) {
            console.error('Error toggling star:', error);
        }
        setShowActions(false);
    };

    const handleReaction = (emoji) => {
        const socket = getSocket();
        if (!socket) return;
        const alreadyReacted = reactions.some((r) => r.emoji === emoji && r.users.includes(user?.username));
        if (alreadyReacted) {
            socket.emit('remove_reaction', { messageId: message.id, emoji });
        } else {
            socket.emit('add_reaction', { messageId: message.id, emoji });
        }
        setShowReactions(false);
    };

    const renderContent = () => {
        if (editing) {
            return (
                <div className="flex items-center gap-2">
                    <input
                        ref={editRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') setEditing(false); }}
                        className="flex-1 bg-transparent border-b border-white/30 outline-none text-sm py-1"
                    />
                    <button onClick={submitEdit} className="text-emerald-300 hover:text-emerald-200"><Check size={16} /></button>
                    <button onClick={() => setEditing(false)} className="text-red-300 hover:text-red-200"><X size={16} /></button>
                </div>
            );
        }

        switch (type) {
            case 'image':
                return (
                    <>
                        <img
                            src={fileUrl || fileUrls[0]}
                            alt={fileName || fileNames[0] || 'Image'}
                            className="max-w-[260px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxIndex(0)}
                            loading="lazy"
                        />
                        {message.content && <p className="mt-1.5 text-sm">{message.content}</p>}
                    </>
                );
            case 'video':
                return (
                    <>
                        <video
                            src={fileUrl || fileUrls[0]}
                            className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxIndex(0)}
                            preload="metadata"
                            muted
                        />
                        {message.content && <p className="mt-1.5 text-sm">{message.content}</p>}
                    </>
                );
            case 'audio':
                return (
                    <>
                        <AudioPlayer src={fileUrl || fileUrls[0]} />
                        {message.content && <p className="mt-1.5 text-sm">{message.content}</p>}
                    </>
                );
            case 'multi':
                const isTwo = fileUrls.length === 2;
                const isThreeOrMore = fileUrls.length >= 3;
                return (
                    <div className="flex flex-col gap-1.5">
                        <div className={`grid gap-1 ${isTwo ? 'grid-cols-2 max-w-[280px]' :
                            isThreeOrMore ? 'grid-cols-2 max-w-[280px]' : 'max-w-[260px]'
                            }`}>
                            {fileUrls.map((url, i) => {
                                const isVideo = url.match(/\.(mp4|webm|mov)$/i);
                                const isMore = isThreeOrMore && i === 3 && fileUrls.length > 4;

                                if (i > 3) return null; // Only show up to 4 items in grid

                                return (
                                    <div
                                        key={i}
                                        className={`relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity aspect-square bg-surface-hover
                                            ${isThreeOrMore && i === 0 ? 'col-span-2 aspect-[2/1]' : ''}
                                        `}
                                        onClick={() => setLightboxIndex(i)}
                                    >
                                        {isVideo ? (
                                            <div className="w-full h-full flex items-center justify-center bg-black/10">
                                                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                    <Play size={14} className="text-white ml-0.5" />
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={url} alt={fileNames[i] || 'Media'} className="w-full h-full object-cover" loading="lazy" />
                                        )}
                                        {isMore && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                <span className="text-white font-medium text-lg">+{fileUrls.length - 4}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {message.content && <p className="text-sm">{message.content}</p>}
                    </div>
                );
            case 'document':
                return (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 bg-black/10 dark:bg-white/5 rounded-lg hover:bg-black/15 dark:hover:bg-white/10 transition-colors no-underline text-inherit">
                        <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <FileText size={18} className="text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{fileName || 'Document'}</div>
                            <div className="text-[10px] opacity-60">{formatSize(fileSize)}</div>
                        </div>
                        <Download size={14} className="opacity-50 flex-shrink-0" />
                    </a>
                );
            default:
                return (
                    <div className="flex flex-col gap-2">
                        <span className="text-sm whitespace-pre-wrap word-break">{message.content}</span>
                        {linkTitle && linkUrl && (
                            <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex flex-col sm:flex-row overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors no-underline text-inherit max-w-[320px]"
                            >
                                {linkImage && (
                                    <div className="w-full sm:w-24 h-32 sm:h-24 shrink-0 bg-surface-hover">
                                        <img src={linkImage} alt={linkTitle} className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                )}
                                <div className="p-2.5 flex flex-col justify-center flex-1 min-w-0">
                                    <div className="text-xs font-semibold truncate mb-0.5">{linkTitle}</div>
                                    {linkDescription && (
                                        <div className="text-[10px] opacity-70 line-clamp-2 leading-snug break-words">
                                            {linkDescription}
                                        </div>
                                    )}
                                    <div className="mt-1 text-[9px] font-medium opacity-50 uppercase tracking-widest truncate">
                                        {new URL(linkUrl).hostname.replace('www.', '')}
                                    </div>
                                </div>
                            </a>
                        )}
                    </div>
                );
        }
    };

    return (
        <>
            <div className={`relative ${isOwn ? 'self-end' : 'self-start'} max-w-[65%]`}>
                {/* Reply icon that appears on swipe */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 transition-opacity"
                    style={{ opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1), transform: `translateX(${-10 + swipeX * 0.3}px) translateY(-50%) scale(${Math.min(swipeX / SWIPE_THRESHOLD, 1)})` }}
                >
                    <Reply size={16} />
                </div>

                <motion.div
                    initial={isOwn ? { opacity: 0, x: 20, scale: 0.95 } : { opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0, right: 0.2 }}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className="relative group w-full"
                    onMouseEnter={() => setShowActions(true)}
                    onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
                >
                    {/* Forwarded indicator */}
                    {isForwarded && (
                        <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1 px-1">
                            <CornerUpRight size={10} /> Forwarded{originalSender ? ` from ${originalSender}` : ''}
                        </div>
                    )}

                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm
          ${isOwn
                            ? 'bg-[#636363] text-white rounded-br-sm shadow-black/5'
                            : 'bg-surface border border-border text-text rounded-bl-sm'}`}
                    >
                        {/* Group Sender Name */}
                        {activeChat?.is_group && !isOwn && (
                            <div className="text-[11px] font-bold text-indigo-400 mb-1">
                                {message.sender_display_name || message.senderUsername || message.sender_username}
                            </div>
                        )}

                        {/* Reply context */}
                        {replyTo && (
                            <div className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-xs
              ${isOwn ? 'bg-white/10 border-white/40' : 'bg-primary-500/5 border-primary-500/40'}`}>
                                <div className="font-semibold opacity-80 text-[10px]">{replyTo.sender_username}</div>
                                <div className="opacity-70 truncate">{replyTo.content || `[${replyTo.message_type}]`}</div>
                            </div>
                        )}

                        {renderContent()}

                        <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${isOwn ? 'justify-end opacity-70' : 'opacity-50'}`}>
                            {message.isHD && <span className="font-bold text-emerald-400">HD</span>}
                            {isStarred && <Star size={10} className={`${isOwn ? 'text-yellow-300' : 'text-yellow-500'} fill-current`} />}
                            {isEdited && <span className="italic">edited</span>}
                            <span>{formatTime(message.createdAt || message.created_at)}</span>
                            <StatusIcon />
                        </div>
                    </div>

                    {/* Reactions display */}
                    {reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {reactions.map((r) => (
                                <button
                                    key={r.emoji}
                                    onClick={() => handleReaction(r.emoji)}
                                    className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all
                  ${r.users.includes(user?.username)
                                            ? 'bg-primary-500/20 border border-primary-500/40'
                                            : 'bg-surface border border-border hover:bg-surface-hover'}`}
                                >
                                    <span>{r.emoji}</span>
                                    <span className="text-[10px] font-medium text-text-muted">{r.users.length}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Action bar on hover */}
                    <AnimatePresence>
                        {showActions && !editing && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.1 }}
                                className={`absolute top-0 flex items-center gap-0.5 bg-surface border border-border rounded-lg shadow-sm p-0.5 z-10
                ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}`}
                            >
                                <button onClick={() => setShowReactions(!showReactions)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-muted hover:text-yellow-400 transition-all" title="React">
                                    <SmilePlus size={14} />
                                </button>
                                <button onClick={handleReply} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-muted hover:text-primary-400 transition-all" title="Reply">
                                    <Reply size={14} />
                                </button>
                                <button onClick={handleStar} className={`w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-hover transition-all ${isStarred ? 'text-yellow-500 hover:text-yellow-600' : 'text-text-muted hover:text-yellow-500'}`} title={isStarred ? "Unstar" : "Star"}>
                                    <Star size={14} className={isStarred ? "fill-current" : ""} />
                                </button>
                                {isOwn && type === 'text' && (
                                    <button onClick={handleEdit} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-muted hover:text-emerald-400 transition-all" title="Edit">
                                        <Pencil size={14} />
                                    </button>
                                )}
                                {isOwn && (
                                    <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-muted hover:text-red-400 transition-all" title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reaction picker */}
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ opacity: 0, y: 5, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                className={`absolute -top-10 bg-surface border border-border rounded-xl shadow-sm p-1.5 flex gap-1 z-20
                ${isOwn ? 'right-0' : 'left-0'}`}
                            >
                                {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReaction(emoji)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover hover:scale-125 transition-all text-lg"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Lightbox */}
            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                index={lightboxIndex >= 0 ? lightboxIndex : 0}
                slides={slides}
                plugins={[Zoom, Video]}
            />
        </>
    );
}

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Check, User as UserIcon, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import api from '../api/axios';
import useChatStore from '../store/chatStore';

export default function ProfilePanel({ onClose }) {
    const { user, setAuth, token } = useChatStore();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        displayName: user?.displayName || user?.username || '',
        bio: user?.bio || '',
    });
    const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const fileInputRef = useRef(null);

    // Cropper State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // Fetch latest profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/me');
                const dbUser = res.data.user;
                setProfile({
                    displayName: dbUser.display_name || dbUser.username,
                    bio: dbUser.bio || '',
                });
                setAvatarPreview(dbUser.avatar_url);
                // Update store with fresh data silently
                setAuth({ ...user, ...dbUser, avatarUrl: dbUser.avatar_url, displayName: dbUser.display_name }, token);
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAvatarPreview(ev.target.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
        // Reset crop state
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const finishCrop = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(avatarPreview, croppedAreaPixels);
            setAvatarFile(croppedImageBlob);
            setAvatarPreview(URL.createObjectURL(croppedImageBlob));
            setIsCropping(false);
        } catch (e) {
            console.error('Error cropping image', e);
            setFeedback({ type: 'error', text: 'Failed to crop image' });
        }
    };

    const cancelCrop = () => {
        setIsCropping(false);
        setAvatarPreview(user?.avatarUrl || null);
        setAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('displayName', profile.displayName);
            formData.append('bio', profile.bio);
            if (avatarFile) formData.append('avatar', avatarFile);

            const res = await api.put('/auth/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updatedUser = res.data.user;
            setAuth({
                ...user,
                avatarUrl: updatedUser.avatar_url,
                displayName: updatedUser.display_name,
                bio: updatedUser.bio,
            }, token);

            setFeedback({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setFeedback(null), 3000);
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (window.confirm("WARNING: Are you absolutely sure you want to delete your account? This action is irreversible and all your data, messages, and friendships will be permanently lost.")) {
            setLoading(true);
            try {
                await api.delete('/auth/account');
                onClose();
                // Store logout handles redirect and cleanup
                useChatStore.getState().logout();
            } catch (err) {
                console.error('Failed to delete account:', err);
                setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to delete account.' });
                setLoading(false);
            }
        }
    };

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-surface border-l border-border shadow-2xl z-40 flex flex-col"
        >
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold">Profile</h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
                {isCropping ? (
                    <div className="absolute inset-0 z-50 bg-surface flex flex-col p-4 h-full">
                        <h3 className="text-lg font-bold mb-4 flex-shrink-0 text-text">Crop Picture</h3>
                        <div className="relative flex-1 bg-black rounded-xl overflow-hidden shadow-glass min-h-[300px]">
                            <Cropper
                                image={avatarPreview}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                                showGrid={false}
                            />
                        </div>
                        <div className="mt-4 flex gap-3 flex-shrink-0">
                            <button onClick={cancelCrop} className="flex-1 py-2.5 rounded-xl bg-surface-hover hover:bg-surface-active text-text font-bold transition-all shadow-sm">Cancel</button>
                            <button onClick={finishCrop} className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold transition-all shadow-md">Apply</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-8 relative group">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border border-border shadow-none bg-surface-active flex items-center justify-center text-text text-4xl">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            user?.username?.charAt(0).toUpperCase() || <UserIcon size={40} />
                        )}

                        {/* Hover overlay */}
                        <div
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-sm text-primary-500 font-medium hover:text-primary-400">
                        Change Picture
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Display Name</label>
                        <input
                            type="text"
                            value={profile.displayName}
                            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                            className="input-field py-2.5 text-sm"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Username</label>
                        <input
                            type="text"
                            value={user?.username || ''}
                            disabled
                            className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl text-text-muted text-sm cursor-not-allowed"
                        />
                    </div>



                    <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Bio</label>
                        <textarea
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            className="input-field py-2.5 text-sm h-24 resize-none"
                            placeholder="Tell us a little about yourself..."
                        />
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="btn-primary w-full shadow-md">
                            {loading ? <span className="spinner w-4 h-4" /> : <><Check size={16} /> Save Changes</>}
                        </button>
                    </div>

                    <div className="pt-6 mt-6 border-t border-border/50">
                        <button 
                            type="button" 
                            onClick={handleDeleteAccount} 
                            disabled={loading} 
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-semibold"
                        >
                            <Trash2 size={16} /> Delete Account
                        </button>
                    </div>

                    {feedback && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-center text-xs font-medium p-2 rounded-lg
                ${feedback.type === 'success' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}
                        >
                            {feedback.text}
                        </motion.div>
                    )}
                </form>
                </>
            )}
            </div>
        </motion.div>
    );
}

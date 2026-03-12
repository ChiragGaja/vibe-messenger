import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Plus, PanelLeftOpen } from 'lucide-react';
import useChatStore from '../store/chatStore';

export default function StatusTray({ onOpenViewer, onOpenUploader, sidebarOpen, onToggleSidebar }) {
    const { user } = useChatStore();
    const [groups, setGroups] = useState([]);

    const fetchStatuses = async () => {
        try {
            const res = await api.get('/status');
            setGroups(res.data.statusGroups);
        } catch (err) {
            console.error('Failed to fetch statuses', err);
        }
    };

    useEffect(() => {
        fetchStatuses();
        // Set up polling or listen to socket
        const interval = setInterval(fetchStatuses, 30000); // 30s polling for demo
        return () => clearInterval(interval);
    }, []);

    const myGroup = groups.find(g => g.userId === user?.id);
    const otherGroups = groups.filter(g => g.userId !== user?.id);

    return (
        <div className="flex items-center gap-4 overflow-x-auto p-4 custom-scrollbar bg-transparent">
            {/* Sidebar Toggle Button (Only visible on desktop when sidebar is hidden) */}
            {!sidebarOpen && typeof onToggleSidebar === 'function' && (
                <div className="hidden md:flex flex-col items-center justify-center flex-shrink-0 h-[70px] mr-2">
                    <button
                        onClick={onToggleSidebar}
                        className="w-10 h-10 items-center justify-center rounded-xl bg-surface border border-border hover:bg-surface-hover text-text-muted hover:text-text transition-all shadow-sm flex"
                        title="Show Sidebar"
                    >
                        <PanelLeftOpen size={20} />
                    </button>
                </div>
            )}

            {/* My Status */}
            <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" onClick={myGroup ? () => onOpenViewer(myGroup.statuses, 0) : onOpenUploader}>
                <div className={`relative w-14 h-14 rounded-full p-[2px] ${myGroup ? 'bg-gradient-to-tr from-primary-400 to-indigo-500' : 'bg-surface-hover border-2 border-dashed border-border'}`}>
                    <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden border-2 border-surface">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Me" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-lg font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    {!myGroup && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center border-2 border-surface">
                            <Plus size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <span className="text-xs font-semibold text-text mt-1">{myGroup ? 'My Status' : 'Add Status'}</span>
            </div>

            {/* Others' Statuses */}
            {otherGroups.map(group => (
                <div key={group.userId} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" onClick={() => onOpenViewer(group.statuses, 0)}>
                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-primary-400 to-indigo-500">
                        <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden border-2 border-surface">
                            {group.avatarUrl ? (
                                <img src={group.avatarUrl} alt={group.username} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold">{group.username.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                    <span className="text-xs font-semibold text-text mt-1 truncate max-w-[60px]">{group.displayName || group.username}</span>
                </div>
            ))}
        </div>
    );
}

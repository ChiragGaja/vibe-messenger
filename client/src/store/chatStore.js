import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set as setIDB, del } from 'idb-keyval';

const idbStorage = {
  getItem: async (name) => {
    return (await get(name)) || null;
  },
  setItem: async (name, value) => {
    await setIDB(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

const useChatStore = create(
    persist(
        (set, get) => ({
    // ─── Auth ─────────────────────────────────────────────
    user: (() => {
        try {
            const stored = localStorage.getItem('user');
            return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    })(),
    setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('user', JSON.stringify(user));
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        set({ user });
    },
    logout: async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await import('../api/axios').then(module => module.default.post('/auth/logout', { refreshToken }));
        } catch (e) {
            console.error('Logout error', e);
        }
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, friends: [], groups: [], friendRequests: [], messages: [], activeChat: null });
    },

    // ─── Friends & Groups ──────────────────────────────────────────
    friends: [],
    groups: [],
    onlineUsers: new Set(),
    setFriends: (friends) => set({ friends }),
    setGroups: (groups) => set({ groups }),
    setUserOnline: (username) => set((state) => {
        const next = new Set(state.onlineUsers);
        next.add(username);
        return { onlineUsers: next };
    }),
    setUserOffline: (username, lastSeen = null) => set((state) => {
        const next = new Set(state.onlineUsers);
        next.delete(username);
        
        let newFriends = state.friends;
        let newActiveChat = state.activeChat;

        if (lastSeen) {
            newFriends = state.friends.map(f => f.username === username ? { ...f, last_seen: lastSeen } : f);
            if (state.activeChat && state.activeChat.username === username) {
                newActiveChat = { ...state.activeChat, last_seen: lastSeen };
            }
        }
        
        return { onlineUsers: next, friends: newFriends, activeChat: newActiveChat };
    }),
    setInitialPresence: (usernames) => set({ onlineUsers: new Set(usernames) }),

    // ─── Friend Requests ─────────────────────────────────
    friendRequests: [],
    setFriendRequests: (friendRequests) => set({ friendRequests }),
    addFriendRequest: (r) => set((s) => ({ friendRequests: [r, ...s.friendRequests] })),
    removeFriendRequest: (id) => set((s) => ({ friendRequests: s.friendRequests.filter((r) => r.id !== id) })),

    // ─── Active Chat ──────────────────────────────────────
    activeChat: null,
    setActiveChat: (friend) => set({ activeChat: friend }),
    setChatTheme: (chatId, themeColor, isGroup) => set((s) => {
        // Update either friends or groups array
        const friendsList = isGroup ? s.friends : s.friends.map(f => f.id === chatId ? { ...f, theme_color: themeColor } : f);
        const groupsList = isGroup ? s.groups.map(g => g.id === chatId ? { ...g, theme_color: themeColor } : g) : s.groups;
        
        // Also update activeChat if it's currently open
        let active = s.activeChat;
        if (active && active.id === chatId && !!active.is_group === !!isGroup) {
            active = { ...active, theme_color: themeColor };
        }
        
        return { friends: friendsList, groups: groupsList, activeChat: active };
    }),

    // ─── Pending Messages (Outbox) ────────────────────────
    pendingMessages: [],
    addPendingMessage: (msg) => set((s) => ({ pendingMessages: [...s.pendingMessages, msg] })),
    removePendingMessage: (tempId) => set((s) => ({ pendingMessages: s.pendingMessages.filter(m => m.tempId !== tempId) })),
    clearPendingMessages: () => set({ pendingMessages: [] }),


    // ─── Messages ─────────────────────────────────────────
    messages: [],
    hasMoreMessages: false,
    setMessages: (messages, hasMore = false) => set({ messages, hasMoreMessages: hasMore }),
    addMessage: (msg) => set((s) => {
        // Normalize camelCase (socket) to snake_case (DB) so isOwn check always works
        const normalized = {
            ...msg,
            sender_username: msg.sender_username || msg.senderUsername,
            message_type: msg.message_type || msg.messageType,
            file_url: msg.file_url || msg.fileUrl,
            file_name: msg.file_name || msg.fileName,
            file_size: msg.file_size || msg.fileSize,
            file_urls: msg.file_urls || msg.fileUrls,
            file_names: msg.file_names || msg.fileNames,
            file_sizes: msg.file_sizes || msg.fileSizes,
            created_at: msg.created_at || msg.createdAt,
            link_title: msg.link_title || msg.linkTitle,
            link_description: msg.link_description || msg.linkDescription,
            link_image: msg.link_image || msg.linkImage,
            link_url: msg.link_url || msg.linkUrl,
            is_forwarded: msg.is_forwarded || msg.isForwarded,
            original_sender: msg.original_sender || msg.originalSender,
        };
        return { messages: [...s.messages, normalized] };
    }),
    prependMessages: (older, hasMore) => set((s) => ({ messages: [...older, ...s.messages], hasMoreMessages: hasMore })),
    updateMessageStatus: (ids, status) => set((s) => ({
        messages: s.messages.map((m) => ids.includes(m.id) ? { ...m, status } : m),
    })),

    // ─── Edit / Delete ────────────────────────────────────
    editMessage: (messageId, newContent) => set((s) => ({
        messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
        ),
    })),
    deleteMessage: (messageId) => set((s) => ({
        messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, is_deleted: true, content: null, file_url: null } : m
        ),
    })),

    // ─── Reactions ────────────────────────────────────────
    updateReactions: (messageId, reactions) => set((s) => ({
        messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
        ),
    })),

    // ─── Reply ────────────────────────────────────────────
    replyTo: null,
    setReplyTo: (msg) => set({ replyTo: msg }),
    clearReplyTo: () => set({ replyTo: null }),

    // ─── Typing ───────────────────────────────────────────
    typingUsers: new Set(),
    setTypingUser: (username) => set((s) => {
        const next = new Set(s.typingUsers);
        next.add(username);
        return { typingUsers: next };
    }),
    removeTypingUser: (username) => set((s) => {
        const next = new Set(s.typingUsers);
        next.delete(username);
        return { typingUsers: next };
    }),

    // ─── Connection ───────────────────────────────────────
    isConnected: false,
    setConnected: (isConnected) => set({ isConnected }),
        }),
        {
            name: 'vibe-chat-storage',
            storage: createJSONStorage(() => idbStorage),
            partialize: (state) => ({
                friends: state.friends,
                groups: state.groups,
                friendRequests: state.friendRequests,
                messages: state.messages,
                pendingMessages: state.pendingMessages,
            }),
        }
    )
);

export default useChatStore;

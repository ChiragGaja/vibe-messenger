import { create } from 'zustand';

const useChatStore = create((set, get) => ({
    // ─── Auth ─────────────────────────────────────────────
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    setAuth: (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        set({ user, token });
    },
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null, friends: [], groups: [], friendRequests: [], messages: [], activeChat: null });
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
    setUserOffline: (username) => set((state) => {
        const next = new Set(state.onlineUsers);
        next.delete(username);
        return { onlineUsers: next };
    }),

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
}));

export default useChatStore;

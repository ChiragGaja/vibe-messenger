import { describe, it, expect, beforeEach } from 'vitest';
import useChatStore from '../store/chatStore';

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset state before each test
    useChatStore.setState({
      user: null,
      token: null,
      friends: [],
      groups: [],
      onlineUsers: new Set(),
      friendRequests: [],
      activeChat: null,
      messages: [],
    });
  });

  it('should initialize with default state', () => {
    const state = useChatStore.getState();
    expect(state.user).toBeNull();
    expect(state.friends).toEqual([]);
    expect(state.onlineUsers.size).toBe(0);
  });

  it('should handle setAuth', () => {
    const mockUser = { id: 1, username: 'testuser' };
    const mockToken = 'mock-token';

    useChatStore.getState().setAuth(mockUser, mockToken);

    const state = useChatStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
  });

  it('should handle setting user online/offline', () => {
    useChatStore.getState().setUserOnline('testuser');
    expect(useChatStore.getState().onlineUsers.has('testuser')).toBe(true);

    useChatStore.getState().setUserOffline('testuser');
    expect(useChatStore.getState().onlineUsers.has('testuser')).toBe(false);
  });
});

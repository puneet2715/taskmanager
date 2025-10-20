import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useUserProfile, 
  useUpdateUserProfile, 
  useUserSearch,
  useDebouncedUserSearch,
  useUsersByIds,
  usePrefetchUser
} from '@/hooks/useUsers';
import { mockFetch, mockFetchError, createTestQueryClient } from '../utils/test-utils';
import { User } from '@/types/api';

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockUsers: User[] = [
  {
    _id: '1',
    email: 'user1@example.com',
    name: 'User One',
    avatar: 'avatar1.jpg',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: '2',
    email: 'user2@example.com',
    name: 'User Two',
    role: 'admin',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useUsers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = mockUsers[0];
      mockFetch({ success: true, data: mockProfile });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfile);
      expect(fetch).toHaveBeenCalledWith('/api/users/profile');
    });

    it('should handle profile not found', async () => {
      mockFetch({ success: true, data: null });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('User profile not found');
    });

    it('should not retry on 401 errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
        })
      ) as jest.Mock;

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should not retry on 401
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on other errors', async () => {
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: 'Server error' } }),
        });
      }) as jest.Mock;

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should retry up to 3 times
      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('useUpdateUserProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { name: 'Updated Name', avatar: 'new-avatar.jpg' };
      const updatedProfile = { ...mockUsers[0], ...updates };

      mockFetch({ success: true, data: updatedProfile });

      const { result } = renderHook(() => useUpdateUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(updates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });

    it('should handle update error and rollback', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['users', 'profile'], mockUsers[0]);

      mockFetchError('Failed to update profile');

      const { result } = renderHook(() => useUpdateUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ name: 'Updated Name' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check that cache was rolled back
      const cachedProfile = queryClient.getQueryData(['users', 'profile']) as User;
      expect(cachedProfile.name).toBe('User One'); // Original name
    });

    it('should perform optimistic updates', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['users', 'profile'], mockUsers[0]);

      const updates = { name: 'Updated Name' };

      // Delay the response to test optimistic update
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: { ...mockUsers[0], ...updates }
            }),
          }), 100)
        )
      ) as jest.Mock;

      const { result } = renderHook(() => useUpdateUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(updates);
      });

      // Check that optimistic update was applied
      const cachedProfile = queryClient.getQueryData(['users', 'profile']) as User;
      expect(cachedProfile.name).toBe('Updated Name');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useUserSearch', () => {
    it('should search users successfully', async () => {
      const searchResults = [mockUsers[0]];
      mockFetch({ success: true, data: searchResults });

      const { result } = renderHook(() => useUserSearch({ query: 'user' }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(searchResults);
      expect(fetch).toHaveBeenCalledWith('/api/users/search?q=user');
    });

    it('should include search parameters in URL', async () => {
      mockFetch({ success: true, data: [] });

      const { result } = renderHook(() => useUserSearch({ 
        query: 'test', 
        limit: 5, 
        exclude: ['user1', 'user2'] 
      }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/users/search?q=test&limit=5&exclude=user1&exclude=user2');
    });

    it('should not search with short queries', () => {
      const { result } = renderHook(() => useUserSearch({ query: 'a' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should not search without query', () => {
      const { result } = renderHook(() => useUserSearch({}), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return empty array as placeholder', () => {
      const { result } = renderHook(() => useUserSearch({ query: 'test' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useDebouncedUserSearch', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce search queries', async () => {
      mockFetch({ success: true, data: [mockUsers[0]] });

      const { result, rerender } = renderHook(
        ({ query }) => useDebouncedUserSearch(query, 300),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { query: 'u' },
        }
      );

      // Initial render - should not search yet
      expect(fetch).not.toHaveBeenCalled();

      // Update query multiple times quickly
      rerender({ query: 'us' });
      rerender({ query: 'use' });
      rerender({ query: 'user' });

      // Fast-forward time but not enough to trigger debounce
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(fetch).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only have called fetch once with the final query
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/users/search?q=user');
    });
  });

  describe('useUsersByIds', () => {
    it('should fetch users by IDs successfully', async () => {
      const userIds = ['1', '2'];
      mockFetch({ success: true, data: mockUsers });

      const { result } = renderHook(() => useUsersByIds(userIds), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(fetch).toHaveBeenCalledWith('/api/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: userIds }),
      });
    });

    it('should not fetch when no IDs provided', () => {
      const { result } = renderHook(() => useUsersByIds([]), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use cached users when available', async () => {
      // Pre-populate cache with individual users
      queryClient.setQueryData(['user', '1'], mockUsers[0]);
      queryClient.setQueryData(['user', '2'], mockUsers[1]);

      const { result } = renderHook(() => useUsersByIds(['1', '2']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(fetch).not.toHaveBeenCalled(); // Should use cache
    });

    it('should fetch only missing users', async () => {
      // Pre-populate cache with one user
      queryClient.setQueryData(['user', '1'], mockUsers[0]);

      mockFetch({ success: true, data: [mockUsers[1]] });

      const { result } = renderHook(() => useUsersByIds(['1', '2']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(fetch).toHaveBeenCalledWith('/api/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ['2'] }), // Only missing ID
      });
    });

    it('should cache individual users after batch fetch', async () => {
      mockFetch({ success: true, data: mockUsers });

      const { result } = renderHook(() => useUsersByIds(['1', '2']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that individual users were cached
      expect(queryClient.getQueryData(['user', '1'])).toEqual(mockUsers[0]);
      expect(queryClient.getQueryData(['user', '2'])).toEqual(mockUsers[1]);
    });
  });

  describe('usePrefetchUser', () => {
    it('should prefetch user data', async () => {
      mockFetch({ success: true, data: mockUsers[0] });

      const { result } = renderHook(() => usePrefetchUser(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current('1');
      });

      // Wait a bit for prefetch to complete
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/users/1');
      });

      // Check that user was cached
      expect(queryClient.getQueryData(['user', '1'])).toEqual(mockUsers[0]);
    });

    it('should not prefetch if already cached', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['user', '1'], mockUsers[0]);

      const { result } = renderHook(() => usePrefetchUser(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current('1');
      });

      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
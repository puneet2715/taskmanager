import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  UpdateUserProfileRequest, 
  UserSearchParams,
  ApiResponse 
} from '@/types/api';
import { 
  queryKeys, 
  optimisticUpdates,
  handleMutationError,
  handleMutationSuccess 
} from '@/lib/query-utils';

// API functions
const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await fetch('/api/users/profile');
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Failed to fetch user profile');
      (error as any).status = response.status;
      throw error;
    }
    const data: ApiResponse<User> = await response.json();
    if (!data.data) {
      throw new Error('User profile not found');
    }
    return data.data;
  },

  updateProfile: async (updates: UpdateUserProfileRequest): Promise<User> => {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update profile');
    }
    const data: ApiResponse<User> = await response.json();
    if (!data.data) {
      throw new Error('Failed to update profile');
    }
    return data.data;
  },

  search: async (params: UserSearchParams): Promise<User[]> => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.append('q', params.query);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.exclude) {
      params.exclude.forEach(id => searchParams.append('exclude', id));
    }

    const response = await fetch(`/api/users/search?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to search users');
    }
    const data: ApiResponse<User[]> = await response.json();
    return data.data || [];
  },
};

// Custom hooks
export const useUserProfile = () => {
  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: usersApi.getProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes (profile data changes less frequently)
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (user not authenticated)
      if (error && error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateProfile,
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userProfile });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(queryKeys.userProfile);

      // Optimistically update
      optimisticUpdates.updateSingleItem(queryKeys.userProfile, updates);

      return { previousProfile };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.userProfile, context.previousProfile);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data) => {
      handleMutationSuccess('Profile updated successfully');
      // Update cache with server response
      queryClient.setQueryData(queryKeys.userProfile, data);
    },
  });
};

export const useUserSearch = (params: UserSearchParams) => {
  return useQuery({
    queryKey: queryKeys.userSearch(params.query || ''),
    queryFn: () => usersApi.search(params),
    enabled: !!params.query && params.query.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: [], // Show empty array while loading
  });
};

// Debounced user search hook for better UX
export const useDebouncedUserSearch = (query: string, delay: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [query, delay]);

  return useUserSearch({ query: debouncedQuery });
};

// Hook for getting users by IDs (useful for displaying assignees, members, etc.)
export const useUsersByIds = (userIds: string[]) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['users', 'byIds', userIds.sort()],
    queryFn: async (): Promise<User[]> => {
      // Try to get users from cache first
      const cachedUsers: User[] = [];
      const missingIds: string[] = [];

      userIds.forEach(id => {
        const cachedUser = queryClient.getQueryData(['user', id]) as User;
        if (cachedUser) {
          cachedUsers.push(cachedUser);
        } else {
          missingIds.push(id);
        }
      });

      // If all users are cached, return them
      if (missingIds.length === 0) {
        return cachedUsers;
      }

      // Fetch missing users
      const response = await fetch('/api/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: missingIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: ApiResponse<User[]> = await response.json();
      const fetchedUsers = data.data || [];

      // Cache individual users
      fetchedUsers.forEach(user => {
        queryClient.setQueryData(['user', user._id], user);
      });

      // Return combined results
      return [...cachedUsers, ...fetchedUsers];
    },
    enabled: userIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for getting all users (for assignee dropdown)
export const useAllUsers = () => {
  return useQuery({
    queryKey: queryKeys.allUsers,
    queryFn: async (): Promise<User[]> => {
      const response = await fetch('/api/users/search?q=&limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data: ApiResponse<User[]> = await response.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for prefetching user data (useful for hover cards, etc.)
export const usePrefetchUser = () => {
  const queryClient = useQueryClient();

  const prefetchUser = React.useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: async () => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data: ApiResponse<User> = await response.json();
        return data.data;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }, [queryClient]);

  return prefetchUser;
};
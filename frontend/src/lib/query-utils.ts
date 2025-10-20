import { Project, UpdateProjectRequest } from '@/types/api';
import { queryClient } from './queryClient';
import toast from 'react-hot-toast';

// Query key factories for consistent cache management
export const queryKeys = {
  // Projects
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  
  // Tasks
  tasks: (projectId: string) => ['tasks', projectId] as const,
  task: (id: string) => ['task', id] as const,
  
  // Users
  users: ['users'] as const,
  allUsers: ['users', 'all'] as const,
  userProfile: ['users', 'profile'] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
} as const;

// Optimistic update utilities
export const optimisticUpdates = {
  // Update a single item in a list
  updateItemInList: <T extends { _id: string }>(
    queryKey: readonly unknown[],
    itemId: string,
    updates: UpdateProjectRequest | Project
  ) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item._id === itemId ? { ...item, ...updates } : item
      );
    });
  },

  // Add item to list
  addItemToList: <T>(queryKey: readonly unknown[], newItem: T) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return [newItem];
      return [...oldData, newItem];
    });
  },

  // Remove item from list
  removeItemFromList: <T extends { _id: string }>(
    queryKey: readonly unknown[],
    itemId: string
  ) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(item => item._id !== itemId);
    });
  },

  // Update single item
  updateSingleItem: <T>(queryKey: readonly unknown[], updates: Partial<T>) => {
    queryClient.setQueryData(queryKey, (oldData: T | undefined) => {
      if (!oldData) return oldData;
      return { ...oldData, ...updates };
    });
  },
};

// Cache invalidation utilities
export const invalidateQueries = {
  // Invalidate all project-related queries
  projects: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  },

  // Invalidate specific project
  project: (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
  },

  // Invalidate tasks for a project
  tasks: (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
  },

  // Invalidate user-related queries
  users: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users });
  },

  // Invalidate all queries (use sparingly)
  all: () => {
    queryClient.invalidateQueries();
  },
};

// Error handling utilities
export const handleMutationError = (error: any, context?: any) => {
  console.error('Mutation error:', error);
  
  // Show user-friendly error message
  const message = error?.response?.data?.error?.message || 
                  error?.message || 
                  'An unexpected error occurred';
  
  toast.error(message);
  
  // Return context for rollback if needed
  return context;
};

// Success message utility
export const handleMutationSuccess = (message: string) => {
  toast.success(message);
};

// Prefetch utilities for better UX
export const prefetchQueries = {
  // Prefetch project details when hovering over project list item
  project: (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.project(projectId),
      queryFn: () => fetch(`/api/projects/${projectId}`).then(res => res.json()),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },

  // Prefetch tasks when navigating to project
  tasks: (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks(projectId),
      queryFn: () => fetch(`/api/projects/${projectId}/tasks`).then(res => res.json()),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  },
};
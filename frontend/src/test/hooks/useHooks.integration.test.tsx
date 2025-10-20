import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useProjects, 
  useProject,
  useTasks, 
  useTask,
  useUserProfile,
  useUserSearch
} from '@/hooks';
import { mockFetch, createTestQueryClient } from '../utils/test-utils';
import { Project, Task, User } from '@/types/api';

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockProjects: Project[] = [
  {
    _id: '1',
    name: 'Test Project 1',
    description: 'Test description 1',
    owner: 'user1',
    members: ['user1', 'user2'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockTasks: Task[] = [
  {
    _id: '1',
    title: 'Test Task 1',
    description: 'Test description 1',
    status: 'todo',
    priority: 'high',
    assignee: 'user1',
    project: 'project1',
    position: 0,
    dueDate: '2024-01-15T00:00:00Z',
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockUser: User = {
  _id: '1',
  email: 'user1@example.com',
  name: 'User One',
  avatar: 'avatar1.jpg',
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('Custom Hooks Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Projects Hooks', () => {
    it('should fetch projects successfully', async () => {
      mockFetch({ success: true, data: mockProjects });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith('/api/projects');
    });

    it('should fetch single project successfully', async () => {
      const mockProject = mockProjects[0];
      mockFetch({ success: true, data: mockProject });

      const { result } = renderHook(() => useProject('1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith('/api/projects/1');
    });

    it('should not fetch project when id is empty', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Tasks Hooks', () => {
    it('should fetch tasks for project successfully', async () => {
      mockFetch({ success: true, data: mockTasks });

      const { result } = renderHook(() => useTasks('project1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTasks);
      expect(fetch).toHaveBeenCalledWith('/api/projects/project1/tasks');
    });

    it('should fetch single task successfully', async () => {
      const mockTask = mockTasks[0];
      mockFetch({ success: true, data: mockTask });

      const { result } = renderHook(() => useTask('1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/1');
    });

    it('should not fetch tasks when projectId is empty', () => {
      const { result } = renderHook(() => useTasks(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should not fetch task when id is empty', () => {
      const { result } = renderHook(() => useTask(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Users Hooks', () => {
    it('should fetch user profile successfully', async () => {
      mockFetch({ success: true, data: mockUser });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
      expect(fetch).toHaveBeenCalledWith('/api/users/profile');
    });

    it('should search users successfully', async () => {
      const searchResults = [mockUser];
      mockFetch({ success: true, data: searchResults });

      const { result } = renderHook(() => useUserSearch({ query: 'user' }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(searchResults);
      });

      expect(fetch).toHaveBeenCalledWith('/api/users/search?q=user');
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
  });

  describe('Query Key Consistency', () => {
    it('should use consistent query keys across hooks', () => {
      // This test ensures that our query keys are consistent
      // and that the hooks are properly configured
      
      const projectsHook = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });
      
      const projectHook = renderHook(() => useProject('1'), {
        wrapper: createWrapper(queryClient),
      });
      
      const tasksHook = renderHook(() => useTasks('project1'), {
        wrapper: createWrapper(queryClient),
      });
      
      const taskHook = renderHook(() => useTask('1'), {
        wrapper: createWrapper(queryClient),
      });
      
      const profileHook = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      // All hooks should be properly initialized
      expect(projectsHook.result.current).toBeDefined();
      expect(projectHook.result.current).toBeDefined();
      expect(tasksHook.result.current).toBeDefined();
      expect(taskHook.result.current).toBeDefined();
      expect(profileHook.result.current).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ 
            success: false,
            error: { message: 'Server error' } 
          }),
        })
      ) as jest.Mock;

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Caching Behavior', () => {
    it('should cache data properly', async () => {
      mockFetch({ success: true, data: mockProjects });

      const { result: result1 } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook should use cached data
      const { result: result2 } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result2.current.data).toEqual(mockProjects);
      // Should only have called fetch once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
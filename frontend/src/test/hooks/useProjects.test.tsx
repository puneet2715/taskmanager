import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useProjects, 
  useProject, 
  useCreateProject, 
  useUpdateProject,
  useDeleteProject
} from '@/hooks/useProjects';
import { mockFetch, mockFetchError, createTestQueryClient } from '../utils/test-utils';
import { Project } from '@/types/api';

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
  {
    _id: '2',
    name: 'Test Project 2',
    description: 'Test description 2',
    owner: 'user1',
    members: ['user1'],
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

describe('useProjects', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useProjects', () => {
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

    it('should handle fetch error', async () => {
      mockFetchError('Failed to fetch projects');

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should return empty array when no data', async () => {
      mockFetch({ success: true, data: null });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useProject', () => {
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

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle project not found', async () => {
      mockFetch({ success: true, data: null });

      const { result } = renderHook(() => useProject('1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Project not found');
    });
  });

  describe('useCreateProject', () => {
    it('should create project successfully', async () => {
      const newProject = {
        name: 'New Project',
        description: 'New description',
        members: ['user1', 'user2'],
      };
      const createdProject = {
        ...newProject,
        _id: '3',
        owner: 'user1',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      mockFetch({ success: true, data: createdProject });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(newProject);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });
    });

    it('should handle create error', async () => {
      mockFetchError('Failed to create project');

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          name: 'New Project',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should perform optimistic updates', async () => {
      // Pre-populate cache with projects
      queryClient.setQueryData(['projects'], [...mockProjects]);

      const newProject = {
        name: 'New Project',
        description: 'New description',
      };

      // Delay the response to test optimistic update
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true, 
              data: { ...newProject, _id: '3', owner: 'user1' }
            }),
          }), 100)
        )
      ) as jest.Mock;

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(newProject);
      });

      // Check that optimistic update was applied
      const cachedProjects = queryClient.getQueryData(['projects']) as Project[];
      expect(cachedProjects).toHaveLength(3);
      expect(cachedProjects[2].name).toBe('New Project');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useUpdateProject', () => {
    it('should update project successfully', async () => {
      const updates = { name: 'Updated Project', description: 'Updated description' };
      const updatedProject = { ...mockProjects[0], ...updates };

      mockFetch({ success: true, data: updatedProject });

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: '1', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/projects/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });

    it('should handle update error and rollback', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['projects'], [...mockProjects]);
      queryClient.setQueryData(['projects', '1'], mockProjects[0]);

      mockFetchError('Failed to update project');

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ 
          id: '1', 
          updates: { name: 'Updated Project' } 
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check that cache was rolled back
      const cachedProject = queryClient.getQueryData(['projects', '1']) as Project;
      expect(cachedProject.name).toBe('Test Project 1'); // Original name
    });
  });

  describe('useDeleteProject', () => {
    it('should delete project successfully', async () => {
      mockFetch({ success: true });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/projects/1', {
        method: 'DELETE',
      });
    });

    it('should remove project from cache on success', async () => {
      // Pre-populate cache with projects
      queryClient.setQueryData(['projects'], [...mockProjects]);
      queryClient.setQueryData(['projects', '1'], mockProjects[0]);
      queryClient.setQueryData(['tasks', '1'], []);

      mockFetch({ success: true });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that project was removed from cache
      const cachedProjects = queryClient.getQueryData(['projects']) as Project[];
      expect(cachedProjects).toHaveLength(1);
      expect(cachedProjects.find(p => p._id === '1')).toBeUndefined();

      // Check that related caches were cleared
      expect(queryClient.getQueryData(['projects', '1'])).toBeUndefined();
      expect(queryClient.getQueryData(['tasks', '1'])).toBeUndefined();
    });

    it('should handle delete error and rollback', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['projects'], [...mockProjects]);

      mockFetchError('Failed to delete project');

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check that cache was rolled back
      const cachedProjects = queryClient.getQueryData(['projects']) as Project[];
      expect(cachedProjects).toHaveLength(2);
      expect(cachedProjects.find(p => p._id === '1')).toBeDefined();
    });
  });
});
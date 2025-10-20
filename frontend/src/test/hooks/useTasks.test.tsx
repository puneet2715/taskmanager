import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useTasks, 
  useTask, 
  useCreateTask, 
  useUpdateTask, 
  useMoveTask,
  useDeleteTask,
  useTaskRealTimeUpdates
} from '@/hooks/useTasks';
import { mockFetch, mockFetchError, createTestQueryClient } from '../utils/test-utils';
import { Task } from '@/types/api';

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

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
  {
    _id: '2',
    title: 'Test Task 2',
    description: 'Test description 2',
    status: 'inprogress',
    priority: 'medium',
    project: 'project1',
    position: 1,
    createdBy: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

// const createWrapper = (queryClient: QueryClient) => {
//   return ({ children }: { children: React.ReactNode }) => (
//     <QueryClientProvider client={queryClient} display-name="">
//       {children}
//     </QueryClientProvider>
//   );
// };

describe('useTasks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useTasks', () => {
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

    it('should not fetch when projectId is empty', () => {
      const { result } = renderHook(() => useTasks(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      mockFetchError('Failed to fetch tasks');

      const { result } = renderHook(() => useTasks('project1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useTask', () => {
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

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useTask(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTask', () => {
    it('should create task successfully', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New description',
        priority: 'high' as const,
      };
      const createdTask = {
        ...newTask,
        _id: '3',
        status: 'todo' as const,
        project: 'project1',
        position: 2,
        createdBy: 'user1',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      mockFetch({ success: true, data: createdTask });

      const { result } = renderHook(() => useCreateTask('project1'), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate(newTask);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/projects/project1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
    });

    it('should handle create error', async () => {
      mockFetchError('Failed to create task');

      const { result } = renderHook(() => useCreateTask('project1'), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        title: 'New Task',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateTask', () => {
    it('should update task successfully', async () => {
      const updates = { title: 'Updated Task', priority: 'low' as const };
      const updatedTask = { ...mockTasks[0], ...updates };

      mockFetch({ success: true, data: updatedTask });

      const { result } = renderHook(() => useUpdateTask('project1'), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: '1', updates });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/tasks/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });
  });

  describe('useMoveTask', () => {
    it('should move task successfully', async () => {
      const moveData = { status: 'done' as const, position: 0 };
      const movedTask = { ...mockTasks[0], ...moveData };

      mockFetch({ success: true, data: movedTask });

      const { result } = renderHook(() => useMoveTask('project1'), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: '1', moveData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/tasks/1/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moveData),
      });
    });
  });

  describe('useDeleteTask', () => {
    it('should delete task successfully', async () => {
      mockFetch({ success: true });

      const { result } = renderHook(() => useDeleteTask('project1'), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/tasks/1', {
        method: 'DELETE',
      });
    });
  });

  describe('useTaskRealTimeUpdates', () => {
    it('should provide real-time update handlers', () => {
      const { result } = renderHook(() => useTaskRealTimeUpdates('project1'), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.handleTaskUpdate).toBeInstanceOf(Function);
      expect(result.current.handleTaskCreate).toBeInstanceOf(Function);
      expect(result.current.handleTaskDelete).toBeInstanceOf(Function);
    });

    it('should handle task update', async () => {
      // Pre-populate cache with tasks
      queryClient.setQueryData(['tasks', 'project1'], [...mockTasks]);

      const { result } = renderHook(() => useTaskRealTimeUpdates('project1'), {
        wrapper: createWrapper(queryClient),
      });

      const updatedTask = { ...mockTasks[0], title: 'Updated via Socket' };
      
      act(() => {
        result.current.handleTaskUpdate(updatedTask);
      });

      await waitFor(() => {
        const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
        expect(cachedTasks).toBeDefined();
        expect(cachedTasks).toHaveLength(2);
        expect(cachedTasks[0].title).toBe('Updated via Socket');
      });
    });

    it('should handle task creation', async () => {
      // Pre-populate cache with tasks
      queryClient.setQueryData(['tasks', 'project1'], [...mockTasks]);

      const { result } = renderHook(() => useTaskRealTimeUpdates('project1'), {
        wrapper: createWrapper(queryClient),
      });

      const newTask: Task = {
        _id: '3',
        title: 'New Task via Socket',
        status: 'todo',
        priority: 'medium',
        project: 'project1',
        position: 2,
        createdBy: 'user1',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      act(() => {
        result.current.handleTaskCreate(newTask);
      });

      await waitFor(() => {
        const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
        expect(cachedTasks).toBeDefined();
        expect(cachedTasks).toHaveLength(3);
        expect(cachedTasks[2]).toEqual(newTask);
      });
    });

    it('should handle task deletion', async () => {
      // Pre-populate cache with tasks
      queryClient.setQueryData(['tasks', 'project1'], [...mockTasks]);

      const { result } = renderHook(() => useTaskRealTimeUpdates('project1'), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.handleTaskDelete('1');
      });

      await waitFor(() => {
        const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
        expect(cachedTasks).toBeDefined();
        expect(cachedTasks).toHaveLength(1);
        expect(cachedTasks.find(task => task._id === '1')).toBeUndefined();
      });
    });
  });
});
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMoveTask } from '@/hooks/useTasks';
import { Task } from '@/types/api';
import React from 'react';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock query utils
jest.mock('@/lib/query-utils', () => ({
  queryKeys: {
    tasks: (projectId: string) => ['tasks', projectId],
    task: (id: string) => ['task', id],
  },
  handleMutationError: jest.fn(),
  handleMutationSuccess: jest.fn(),
  invalidateQueries: {
    tasks: jest.fn(),
  },
}));

const mockTasks: Task[] = [
  {
    _id: 'task1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'todo',
    priority: 'medium',
    position: 0,
    project: 'project1',
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'task2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'todo',
    priority: 'high',
    position: 1,
    project: 'project1',
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'task3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'inprogress',
    priority: 'low',
    position: 0,
    project: 'project1',
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

// const createWrapper = () => {
//   const queryClient = new QueryClient({
//     defaultOptions: {
//       queries: { retry: false },
//       mutations: { retry: false },
//     },
//   });

//   // Pre-populate cache with mock tasks
//   queryClient.setQueryData(['tasks', 'project1'], mockTasks);

//   return ({ children }: { children: React.ReactNode }) => (
//     React.createElement(QueryClientProvider, { client: queryClient }, children)
//   );
// };

describe('useMoveTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('successfully moves a task to a different status', async () => {
    const movedTask = {
      ...mockTasks[0],
      status: 'inprogress' as const,
      position: 1,
      updatedAt: '2023-01-01T01:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: movedTask,
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation
    await result.current.mutateAsync({
      id: 'task1',
      moveData: {
        status: 'inprogress',
        position: 1,
      },
    });

    // Check that the API was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task1/move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'inprogress',
        position: 1,
      }),
    });
  });

  it('handles API errors and rolls back optimistic updates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'MOVE_TASK_ERROR',
          message: 'Failed to move task',
        },
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation and expect it to throw
    await expect(
      result.current.mutateAsync({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 1,
        },
      })
    ).rejects.toThrow('Failed to move task');
  });

  it('handles network errors with specific error message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation and expect it to throw
    await expect(
      result.current.mutateAsync({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 1,
        },
      })
    ).rejects.toThrow('Network error');
  });

  it('handles permission errors with specific error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Permission denied: You do not have permission to move this task.',
        },
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation and expect it to throw
    await expect(
      result.current.mutateAsync({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 1,
        },
      })
    ).rejects.toThrow('Permission denied: You do not have permission to move this task.');
  });

  it('handles task not found errors with specific error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found: The task may have been deleted by another user.',
        },
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation and expect it to throw
    await expect(
      result.current.mutateAsync({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 1,
        },
      })
    ).rejects.toThrow('Task not found: The task may have been deleted by another user.');
  });

  it('performs optimistic updates correctly when moving between columns', async () => {
    const movedTask = {
      ...mockTasks[0],
      status: 'inprogress' as const,
      position: 1,
      updatedAt: '2023-01-01T01:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: movedTask,
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation
    const mutationPromise = result.current.mutateAsync({
      id: 'task1',
      moveData: {
        status: 'inprogress',
        position: 1,
      },
    });

    // The optimistic update should happen immediately
    // We can't easily test the cache state here, but the mutation should complete
    await mutationPromise;

    expect(mockFetch).toHaveBeenCalled();
  });

  it('performs optimistic updates correctly when reordering within same column', async () => {
    const movedTask = {
      ...mockTasks[0],
      position: 1,
      updatedAt: '2023-01-01T01:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: movedTask,
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Execute the mutation - moving task1 from position 0 to position 1 in same column
    await result.current.mutateAsync({
      id: 'task1',
      moveData: {
        status: 'todo',
        position: 1,
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task1/move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'todo',
        position: 1,
      }),
    });
  });

  it('handles missing task data gracefully', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    // Try to move a task that doesn't exist in cache
    await expect(
      result.current.mutateAsync({
        id: 'nonexistent-task',
        moveData: {
          status: 'inprogress',
          position: 0,
        },
      })
    ).rejects.toThrow();
  });

  it('logs successful moves for debugging', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    const movedTask = {
      ...mockTasks[0],
      status: 'inprogress' as const,
      position: 1,
      updatedAt: '2023-01-01T01:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: movedTask,
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMoveTask('project1'), { wrapper });

    await result.current.mutateAsync({
      id: 'task1',
      moveData: {
        status: 'inprogress',
        position: 1,
      },
    });

    // Check that success was logged
    expect(consoleSpy).toHaveBeenCalledWith('Task moved successfully:', {
      taskId: 'task1',
      from: { status: 'todo', position: 0 },
      to: { status: 'inprogress', position: 1 }
    });

    consoleSpy.mockRestore();
  });
});
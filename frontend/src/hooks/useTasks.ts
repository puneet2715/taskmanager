import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  MoveTaskRequest,
  ApiResponse 
} from '@/types/api';
import { 
  queryKeys, 
  optimisticUpdates, 
  invalidateQueries,
  handleMutationError,
  handleMutationSuccess 
} from '@/lib/query-utils';

// API functions
const tasksApi = {
  getByProject: async (projectId: string): Promise<Task[]> => {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    const data: ApiResponse<Task[]> = await response.json();
    return data.data || [];
  },

  getById: async (id: string): Promise<Task> => {
    const response = await fetch(`/api/tasks/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch task');
    }
    const data: ApiResponse<Task> = await response.json();
    if (!data.data) {
      throw new Error('Task not found');
    }
    return data.data;
  },

  create: async (projectId: string, taskData: CreateTaskRequest): Promise<Task> => {
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create task');
    }
    const data: ApiResponse<Task> = await response.json();
    if (!data.data) {
      throw new Error('Failed to create task');
    }
    return data.data;
  },

  update: async (id: string, updates: UpdateTaskRequest): Promise<Task> => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update task');
    }
    const data: ApiResponse<Task> = await response.json();
    if (!data.data) {
      throw new Error('Failed to update task');
    }
    return data.data;
  },

  move: async (id: string, moveData: MoveTaskRequest): Promise<Task> => {
    const response = await fetch(`/api/tasks/${id}/move`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(moveData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to move task');
    }
    const data: ApiResponse<Task> = await response.json();
    if (!data.data) {
      throw new Error('Failed to move task');
    }
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete task');
    }
  },
};

// Custom hooks
export const useTasks = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => tasksApi.getByProject(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for real-time updates)
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskRequest) => tasksApi.create(projectId, taskData),
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(projectId) });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(queryKeys.tasks(projectId));

      // Optimistically update with temporary task
      const tempTask: Task = {
        _id: `temp-${Date.now()}`,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status || 'todo',
        priority: newTask.priority || 'medium',
        assignee: newTask.assignee,
        project: projectId,
        position: 0, // Will be calculated by server
        dueDate: newTask.dueDate,
        createdBy: 'current-user', // Will be replaced by server response
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      optimisticUpdates.addItemToList(queryKeys.tasks(projectId), tempTask);

      return { previousTasks, tempTask };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(projectId), context.previousTasks);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data) => {
      handleMutationSuccess('Task created successfully');
      // Invalidate and refetch tasks to get the real data
      invalidateQueries.tasks(projectId);
    },
  });
};

export const useUpdateTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskRequest }) =>
      tasksApi.update(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.task(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(projectId) });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(queryKeys.task(id));
      const previousTasks = queryClient.getQueryData(queryKeys.tasks(projectId));

      // Optimistically update
      optimisticUpdates.updateSingleItem(queryKeys.task(id), updates);
      optimisticUpdates.updateItemInList(queryKeys.tasks(projectId), id, updates);

      return { previousTask, previousTasks };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.task(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(projectId), context.previousTasks);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data, { id }) => {
      handleMutationSuccess('Task updated successfully');
      // Update cache with server response
      queryClient.setQueryData(queryKeys.task(id), data);
      invalidateQueries.tasks(projectId);
    },
  });
};

export const useMoveTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moveData }: { id: string; moveData: MoveTaskRequest }) =>
      tasksApi.move(id, moveData),
    onMutate: async ({ id, moveData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(projectId) });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks(projectId));

      if (!previousTasks) {
        return { previousTasks: null };
      }

      // Find the task being moved
      const taskIndex = previousTasks.findIndex(task => task._id === id);
      if (taskIndex === -1) {
        return { previousTasks };
      }

      const taskToMove = previousTasks[taskIndex];
      const oldStatus = taskToMove.status;
      const oldPosition = taskToMove.position;

      // Create optimistic update
      const updatedTasks = [...previousTasks];
      
      // Update the moved task
      updatedTasks[taskIndex] = {
        ...taskToMove,
        status: moveData.status,
        position: moveData.position,
        updatedAt: new Date().toISOString(),
      };

      // If status changed, we need to recalculate positions for affected tasks
      if (oldStatus !== moveData.status) {
        // Remove task from old column and adjust positions
        updatedTasks
          .filter(task => task.status === oldStatus && task.position > oldPosition)
          .forEach(task => {
            const index = updatedTasks.findIndex(t => t._id === task._id);
            if (index !== -1) {
              updatedTasks[index] = { ...task, position: task.position - 1 };
            }
          });

        // Add task to new column and adjust positions
        updatedTasks
          .filter(task => task.status === moveData.status && task._id !== id && task.position >= moveData.position)
          .forEach(task => {
            const index = updatedTasks.findIndex(t => t._id === task._id);
            if (index !== -1) {
              updatedTasks[index] = { ...task, position: task.position + 1 };
            }
          });
      } else {
        // Same column, just reorder
        const tasksInColumn = updatedTasks.filter(task => task.status === moveData.status && task._id !== id);
        
        if (oldPosition < moveData.position) {
          // Moving down
          tasksInColumn
            .filter(task => task.position > oldPosition && task.position <= moveData.position)
            .forEach(task => {
              const index = updatedTasks.findIndex(t => t._id === task._id);
              if (index !== -1) {
                updatedTasks[index] = { ...task, position: task.position - 1 };
              }
            });
        } else if (oldPosition > moveData.position) {
          // Moving up
          tasksInColumn
            .filter(task => task.position >= moveData.position && task.position < oldPosition)
            .forEach(task => {
              const index = updatedTasks.findIndex(t => t._id === task._id);
              if (index !== -1) {
                updatedTasks[index] = { ...task, position: task.position + 1 };
              }
            });
        }
      }

      // Apply optimistic update
      queryClient.setQueryData(queryKeys.tasks(projectId), updatedTasks);

      return { 
        previousTasks,
        taskId: id,
        oldStatus,
        oldPosition,
        newStatus: moveData.status,
        newPosition: moveData.position
      };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(projectId), context.previousTasks);
      }
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to move task';
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'Network error: Unable to move task. Please check your connection.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied: You do not have permission to move this task.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Task not found: The task may have been deleted by another user.';
        } else {
          errorMessage = error.message;
        }
      }
      
      handleMutationError(new Error(errorMessage), context);
    },
    onSuccess: (data, variables, context) => {
      handleMutationSuccess('Task moved successfully');
      
      // Update cache with server response (includes recalculated positions)
      // This ensures we have the correct positions from the server
      invalidateQueries.tasks(projectId);
      
      // Log the successful move for debugging
      if (context) {
        console.log('Task moved successfully:', {
          taskId: context.taskId,
          from: { status: context.oldStatus, position: context.oldPosition },
          to: { status: context.newStatus, position: context.newPosition }
        });
      }
    },
  });
};

export const useDeleteTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.delete,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(projectId) });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(queryKeys.tasks(projectId));

      // Optimistically remove from list
      optimisticUpdates.removeItemFromList(queryKeys.tasks(projectId), id);

      return { previousTasks };
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(projectId), context.previousTasks);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data, id) => {
      handleMutationSuccess('Task deleted successfully');
      // Remove task-specific cache
      queryClient.removeQueries({ queryKey: queryKeys.task(id) });
    },
  });
};

// Hook to get all tasks across all user's projects for dashboard statistics
export const useAllUserTasks = (projectIds: string[]) => {
  return useQuery({
    queryKey: ['all-user-tasks', projectIds.sort()],
    queryFn: async (): Promise<Task[]> => {
      if (projectIds.length === 0) return [];
      
      // Fetch tasks for all projects in parallel
      const taskPromises = projectIds.map(projectId => 
        tasksApi.getByProject(projectId).catch(() => []) // Return empty array on error
      );
      
      const taskArrays = await Promise.all(taskPromises);
      return taskArrays.flat();
    },
    enabled: projectIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Dashboard-specific hook with shorter staleTime for fresh statistics
export const useDashboardTasks = (projectIds: string[]) => {
  return useQuery({
    queryKey: ['dashboard-tasks', projectIds.sort()],
    queryFn: async (): Promise<Task[]> => {
      if (projectIds.length === 0) return [];
      
      // Fetch tasks for all projects in parallel
      const taskPromises = projectIds.map(projectId => 
        tasksApi.getByProject(projectId).catch(() => []) // Return empty array on error
      );
      
      const taskArrays = await Promise.all(taskPromises);
      return taskArrays.flat();
    },
    enabled: projectIds.length > 0,
    staleTime: 0, // Always refetch for dashboard statistics
    gcTime: 1 * 60 * 1000, // Keep in cache for 1 minute
    refetchInterval: 10 * 1000, // Refresh every 30 seconds
  });
};

// Real-time update utilities for Socket.io integration
export const useTaskRealTimeUpdates = (projectId: string) => {
  const queryClient = useQueryClient();

  const handleTaskUpdate = (updatedTask: Task) => {
    // Update individual task cache
    queryClient.setQueryData(queryKeys.task(updatedTask._id), updatedTask);
    
    // Update task in the project's task list
    optimisticUpdates.updateItemInList(
      queryKeys.tasks(projectId), 
      updatedTask._id, 
      updatedTask
    );
  };

  const handleTaskCreate = (newTask: Task) => {
    // Add to project's task list
    optimisticUpdates.addItemToList(queryKeys.tasks(projectId), newTask);
  };

  const handleTaskDelete = (taskId: string) => {
    // Remove from project's task list
    optimisticUpdates.removeItemFromList(queryKeys.tasks(projectId), taskId);
    
    // Remove individual task cache
    queryClient.removeQueries({ queryKey: queryKeys.task(taskId) });
  };

  return {
    handleTaskUpdate,
    handleTaskCreate,
    handleTaskDelete,
  };
};
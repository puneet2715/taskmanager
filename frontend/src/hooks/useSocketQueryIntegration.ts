import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../components/providers/SocketProvider';
import { Task, Project } from '../types/api';
import toast from 'react-hot-toast';

export const useSocketQueryIntegration = () => {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocketContext();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Handle task updates
    const handleTaskUpdated = (updatedTask: Task) => {
      console.log('Socket: Task updated', updatedTask);

      // Update the specific task in all relevant caches
      const projectId = typeof updatedTask.project === 'string' ? updatedTask.project : updatedTask.project?._id;
      const taskId = updatedTask._id || updatedTask.id;

      if (!projectId || !taskId) {
        console.warn('Socket: Task update missing required IDs', { projectId, taskId, updatedTask });
        return;
      }

      // Update tasks cache for the project
      queryClient.setQueryData(['tasks', projectId], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;

        return oldTasks.map(task =>
          task._id === taskId
            ? { ...task, ...updatedTask, _id: taskId }
            : task
        );
      });

      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    };

    // Handle task moves (drag and drop)
    const handleTaskMoved = (taskId: string, newStatus: string, newPosition: number) => {
      console.log('Socket: Task moved', { taskId, newStatus, newPosition });

      // Find the task in all project caches and update its status and position
      queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach(query => {
        const projectId = query.queryKey[1] as string;

        queryClient.setQueryData(['tasks', projectId], (oldTasks: Task[] | undefined) => {
          if (!oldTasks) return oldTasks;

          const taskIndex = oldTasks.findIndex(task => task._id === taskId);
          if (taskIndex === -1) return oldTasks;

          const updatedTasks = [...oldTasks];
          const movedTask = { ...updatedTasks[taskIndex] };

          // Update task status and position
          movedTask.status = newStatus as Task['status'];
          movedTask.position = newPosition;

          // Remove task from old position
          updatedTasks.splice(taskIndex, 1);

          // Find new position based on status and position
          const tasksWithSameStatus = updatedTasks.filter(task => task.status === newStatus);
          const insertIndex = Math.min(newPosition, tasksWithSameStatus.length);

          // Insert at new position
          const finalInsertIndex = updatedTasks.findIndex(task => task.status === newStatus) + insertIndex;
          updatedTasks.splice(finalInsertIndex >= 0 ? finalInsertIndex : updatedTasks.length, 0, movedTask);

          return updatedTasks;
        });
      });
    };

    // Handle new task creation
    const handleTaskCreated = (newTask: Task) => {
      console.log('Socket: Task created', newTask);

      const projectId = typeof newTask.project === 'string' ? newTask.project : newTask.project?._id;
      const taskId = newTask._id || newTask.id;

      if (!projectId || !taskId) {
        console.warn('Socket: Task creation missing required IDs', { projectId, taskId, newTask });
        return;
      }

      // Add the new task to the project's task cache
      queryClient.setQueryData(['tasks', projectId], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return [newTask];

        // Check if task already exists (avoid duplicates)
        const taskExists = oldTasks.some(task => task._id === taskId);
        if (taskExists) return oldTasks;

        return [...oldTasks, { ...newTask, _id: taskId }];
      });

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    };

    // Handle task deletion
    const handleTaskDeleted = (taskId: string, projectId: string) => {
      console.log('Socket: Task deleted', { taskId, projectId });

      // Remove the task from the project's task cache
      queryClient.setQueryData(['tasks', projectId], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;

        return oldTasks.filter(task => task._id !== taskId);
      });

      // Remove individual task cache
      queryClient.removeQueries({ queryKey: ['task', taskId] });

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    };

    // Handle project updates
    const handleProjectUpdated = (updatedProject: Project) => {
      console.log('Socket: Project updated', updatedProject);

      const projectId = updatedProject._id || updatedProject.id;

      // Update projects list cache
      queryClient.setQueryData(['projects'], (oldProjects: Project[] | undefined) => {
        if (!oldProjects) return oldProjects;

        return oldProjects.map(project =>
          project._id === projectId
            ? { ...project, ...updatedProject, _id: projectId }
            : project
        );
      });

      // Update individual project cache
      queryClient.setQueryData(['project', projectId], updatedProject);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    };

    // Handle member removal
    const handleMemberRemoved = (removedUserIds: string[], projectId: string) => {
      console.log('Socket: Members removed from project', { removedUserIds, projectId });

      const currentUserId = session?.user?.id;
      const currentUserEmail = session?.user?.email;

      // Check if the current user was removed
      const wasCurrentUserRemoved = removedUserIds.some(removedId =>
        removedId === currentUserId || removedId === currentUserEmail
      );

      if (wasCurrentUserRemoved) {
        // Show notification and redirect to dashboard
        toast.error('You have been removed from this project');

        // Remove project from cache since user no longer has access
        queryClient.removeQueries({ queryKey: ['project', projectId] });
        queryClient.removeQueries({ queryKey: ['tasks', projectId] });

        // Invalidate projects list to reflect the change
        queryClient.invalidateQueries({ queryKey: ['projects'] });

        // Redirect to dashboard after a short delay to allow toast to show
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        // Other members were removed, just update the project cache
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
    };

    // Set up socket event listeners
    socket.on('taskUpdated', handleTaskUpdated  as (task: unknown) => void);
    socket.on('taskMoved', handleTaskMoved);
    socket.on('taskCreated', handleTaskCreated  as (task: unknown) => void);
    socket.on('taskDeleted', handleTaskDeleted);
    socket.on('projectUpdated', handleProjectUpdated  as (task: unknown) => void);
    socket.on('memberRemoved', handleMemberRemoved);

    // Cleanup function
    return () => {
      socket.off('taskUpdated', handleTaskUpdated  as (task: unknown) => void);
      socket.off('taskMoved', handleTaskMoved);
      socket.off('taskCreated', handleTaskCreated  as (task: unknown) => void);
      socket.off('taskDeleted', handleTaskDeleted);
      socket.off('projectUpdated', handleProjectUpdated  as (task: unknown) => void);
      socket.off('memberRemoved', handleMemberRemoved);
    };
  }, [socket, isConnected, queryClient, router, session]);

  // Return methods for manual cache updates if needed
  return {
    invalidateTasksForProject: (projectId: string) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    invalidateProjects: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    refetchTasksForProject: (projectId: string) => {
      queryClient.refetchQueries({ queryKey: ['tasks', projectId] });
    },
  };
};
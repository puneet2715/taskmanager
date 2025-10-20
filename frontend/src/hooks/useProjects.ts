import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
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
const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    const data: ApiResponse<Project[]> = await response.json();
    return data.data || [];
  },

  getById: async (id: string): Promise<Project> => {
    const response = await fetch(`/api/projects/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    const data: ApiResponse<Project> = await response.json();
    if (!data.data) {
      throw new Error('Project not found');
    }
    return data.data;
  },

  create: async (projectData: CreateProjectRequest): Promise<Project> => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error?.message || errorData.error || 'Failed to create project');
    }
    const data: ApiResponse<Project> = await response.json();
    console.log('API Success Response:', data);
    if (!data.data) {
      throw new Error('Failed to create project - no data in response');
    }
    return data.data;
  },

  update: async (id: string, updates: UpdateProjectRequest): Promise<Project> => {
    console.log('Updating project:', id, 'with updates:', updates);

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update project');
    }
    const data: ApiResponse<Project> = await response.json();
    if (!data.data) {
      throw new Error('Failed to update project');
    }
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete project');
    }
  },
};

// Custom hooks
export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: projectsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Dashboard-specific hook with shorter staleTime for fresh statistics
export const useDashboardProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: projectsApi.getAll,
    staleTime: 0, // Always refetch for dashboard
    gcTime: 1 * 60 * 1000, // Keep in cache for 1 minute
    refetchInterval: 10 * 1000, // Refresh every 30 seconds
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.create,
    onMutate: async (newProject) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(queryKeys.projects);

      // Optimistically update with temporary project
      const tempProject: Project = {
        _id: `temp-${Date.now()}`,
        name: newProject.name,
        description: newProject.description,
        owner: 'current-user', // Will be replaced by server response
        members: newProject.members || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      optimisticUpdates.addItemToList(queryKeys.projects, tempProject);

      return { previousProjects, tempProject };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects, context.previousProjects);
      }
      handleMutationError(error, context);
    },
    onSuccess: () => {
      handleMutationSuccess('Project created successfully');
      // Invalidate and refetch projects to get the real data
      invalidateQueries.projects();
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateProjectRequest }) => {
      console.log('useUpdateProject mutationFn called with:', { id, updates });
      return projectsApi.update(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.project(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });

      // Snapshot previous values
      const previousProject = queryClient.getQueryData(queryKeys.project(id));
      const previousProjects = queryClient.getQueryData(queryKeys.projects);

      // Optimistically update
      optimisticUpdates.updateSingleItem(queryKeys.project(id), updates);
      optimisticUpdates.updateItemInList(queryKeys.projects, id, updates);
      // optimisticUpdates.updateItemInList(queryKeys.projects, id, updates);

      return { previousProject, previousProjects };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.project(id), context.previousProject);
      }
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects, context.previousProjects);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data, { id }) => {
      handleMutationSuccess('Project updated successfully');
      // Update cache with server response
      queryClient.setQueryData(queryKeys.project(id), data);
      // Update the project in the projects list cache as well
      optimisticUpdates.updateItemInList(queryKeys.projects, id, data);
      // Only invalidate if we need fresh data from server (removed to prevent unnecessary re-renders)
      // invalidateQueries.projects();
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.delete,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(queryKeys.projects);

      // Optimistically remove from list
      optimisticUpdates.removeItemFromList(queryKeys.projects, id);

      return { previousProjects };
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects, context.previousProjects);
      }
      handleMutationError(error, context);
    },
    onSuccess: (data, id) => {
      handleMutationSuccess('Project deleted successfully');
      // Remove project-specific cache
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });
      // Remove tasks cache for this project
      queryClient.removeQueries({ queryKey: queryKeys.tasks(id) });
    },
  });
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ProjectSummary,
  AIResponse,
  AIStatus,
  GenerateProjectSummaryRequest,
  AskTaskQuestionRequest,
  ApiResponse,
  AIErrorResponse
} from '@/types/api';
import {
  queryKeys,
  handleMutationError,
  handleMutationSuccess
} from '@/lib/query-utils';

// Extend query keys for AI functionality
const aiQueryKeys = {
  ...queryKeys,
  // AI-specific keys
  aiStatus: ['ai', 'status'] as const,
  projectSummary: (projectId: string) => ['ai', 'summary', projectId] as const,
  taskQuestions: (taskId: string) => ['ai', 'questions', taskId] as const,
} as const;

// API functions
const aiApi = {
  getStatus: async (): Promise<AIStatus> => {
    const response = await fetch('/api/ai/status');
    if (!response.ok) {
      throw new Error('Failed to fetch AI status');
    }
    const data: ApiResponse<AIStatus> = await response.json();
    return data.data || { available: false, quotaRemaining: 0, quotaLimit: 0, requestsToday: 0 };
  },

  generateProjectSummary: async (projectId: string): Promise<ProjectSummary> => {
    const response = await fetch(`/api/ai/projects/${projectId}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: AIErrorResponse = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate project summary');
    }

    const data: ApiResponse<ProjectSummary> = await response.json();
    if (!data.data) {
      throw new Error('Failed to generate project summary');
    }
    return data.data;
  },

  getLatestProjectSummary: async (projectId: string): Promise<ProjectSummary | null> => {
    const response = await fetch(`/api/ai/projects/${projectId}/summary/latest`);
    if (response.status === 404) {
      return null; // No summary exists yet
    }
    if (!response.ok) {
      throw new Error('Failed to fetch latest project summary');
    }
    const data: ApiResponse<ProjectSummary> = await response.json();
    return data.data || null;
  },

  askTaskQuestion: async (taskId: string, question: string): Promise<AIResponse> => {
    const response = await fetch(`/api/ai/tasks/${taskId}/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorData: AIErrorResponse = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get AI response');
    }

    const data: ApiResponse<AIResponse> = await response.json();
    if (!data.data) {
      throw new Error('Failed to get AI response');
    }
    return data.data;
  },

  getTaskQuestionHistory: async (taskId: string): Promise<AIResponse[]> => {
    const response = await fetch(`/api/ai/tasks/${taskId}/question`);
    if (!response.ok) {
      throw new Error('Failed to fetch question history');
    }
    const data: ApiResponse<AIResponse[]> = await response.json();
    return data.data || [];
  },
};

// Custom hooks

// AI Status hook
export const useAIStatus = () => {
  return useQuery({
    queryKey: aiQueryKeys.aiStatus,
    queryFn: aiApi.getStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for AI status
  });
};

// Project Summary hooks
export const useLatestProjectSummary = (projectId: string) => {
  return useQuery({
    queryKey: aiQueryKeys.projectSummary(projectId),
    queryFn: () => aiApi.getLatestProjectSummary(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes - summaries don't change frequently
  });
};

export const useGenerateProjectSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => aiApi.generateProjectSummary(projectId),
    onSuccess: (data, projectId) => {
      // Update the cache with the new summary
      queryClient.setQueryData(aiQueryKeys.projectSummary(projectId), data);

      // Invalidate AI status to get updated quota info
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.aiStatus });

      handleMutationSuccess('Project summary generated successfully');
    },
    onError: (error) => {
      handleMutationError(error);
    },
  });
};

// Task Question hooks
export const useTaskQuestionHistory = (taskId: string) => {
  return useQuery({
    queryKey: aiQueryKeys.taskQuestions(taskId),
    queryFn: () => aiApi.getTaskQuestionHistory(taskId),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAskTaskQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, question }: { taskId: string; question: string }) =>
      aiApi.askTaskQuestion(taskId, question),
    onSuccess: (data, { taskId }) => {
      // Add the new response to the question history
      queryClient.setQueryData(
        aiQueryKeys.taskQuestions(taskId),
        (oldData: AIResponse[] | undefined) => {
          if (!oldData) return [data];
          return [...oldData, data];
        }
      );

      // Invalidate AI status to get updated quota info
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.aiStatus });

      handleMutationSuccess('AI response generated successfully');
    },
    onError: (error) => {
      handleMutationError(error);
    },
  });
};

// Utility hook to check if AI features are available
export const useAIAvailability = () => {
  const { data: aiStatus, isLoading } = useAIStatus();

  return {
    isAvailable: aiStatus?.available ?? false,
    isLoading,
    quotaRemaining: aiStatus?.quotaRemaining ?? 0,
    quotaLimit: aiStatus?.quotaLimit ?? 0,
    requestsToday: aiStatus?.requestsToday ?? 0,
    hasQuota: (aiStatus?.quotaRemaining ?? 0) > 0,
  };
};
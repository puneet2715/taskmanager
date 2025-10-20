// Base API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Entity types (matching backend models)
export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  owner: string | User;
  members: string[] | User[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string | User;
  project: string | Project;
  position: number;
  dueDate?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  action: 'created' | 'updated' | 'deleted' | 'moved';
  entityType: 'task' | 'project';
  entityId: string;
  user: string | User;
  project: string | Project;
  changes?: Record<string, any>;
  timestamp: string;
}

// Request types for mutations
export interface CreateProjectRequest {
  name: string;
  description?: string;
  members?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  members?: string[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee?: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee?: string;
  dueDate?: string;
  position?: number;
}

export interface MoveTaskRequest {
  status: Task['status'];
  position: number;
}

export interface UpdateUserProfileRequest {
  name?: string;
  avatar?: string;
}

// Search and filter types
export interface UserSearchParams {
  query?: string;
  limit?: number;
  exclude?: string[];
  enabled?: boolean
}

export interface TaskFilters {
  status?: Task['status'];
  assignee?: string;
  priority?: Task['priority'];
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// AI-related types
export interface ProjectSummary {
  _id: string;
  projectId: string;
  userId: string;
  summary: string;
  taskCount: number;
  statusBreakdown: {
    todo: number;
    inprogress: number;
    done: number;
  };
  generatedAt: string;
  expiresAt: string;
}

export interface AIResponse {
  _id: string;
  taskId: string;
  userId: string;
  question: string;
  answer: string;
  confidence: number;
  context: {
    taskTitle: string;
    taskDescription: string;
    projectName: string;
  };
  createdAt: string;
}

export interface AIStatus {
  available: boolean;
  quotaRemaining: number;
  quotaLimit: number;
  requestsToday: number;
}

// AI request types
export interface GenerateProjectSummaryRequest {
  projectId: string;
}

export interface AskTaskQuestionRequest {
  taskId: string;
  question: string;
}

// AI error response
export interface AIErrorResponse {
  success: false;
  error: {
    code: 'AI_SERVICE_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'INVALID_REQUEST' | 'UNAUTHORIZED';
    message: string;
    details?: {
      quotaRemaining?: number;
      retryAfter?: number;
    };
  };
  timestamp: string;
}
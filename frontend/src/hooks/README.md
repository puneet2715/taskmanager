# Custom React Query Hooks

This directory contains custom React Query hooks for data fetching and state management in the Collaborative Task Manager application.

## Overview

The hooks are built on top of React Query (TanStack Query) and provide:
- Optimistic updates for better UX
- Error handling and retry logic
- Caching and background updates
- Real-time integration support
- Consistent query key management

## Hooks

### Projects Hooks (`useProjects.ts`)

#### Query Hooks
- `useProjects()` - Fetch all projects for the current user
- `useProject(id)` - Fetch a specific project by ID

#### Mutation Hooks
- `useCreateProject()` - Create a new project with optimistic updates
- `useUpdateProject()` - Update an existing project
- `useDeleteProject()` - Delete a project and clean up related cache

### Tasks Hooks (`useTasks.ts`)

#### Query Hooks
- `useTasks(projectId)` - Fetch all tasks for a specific project
- `useTask(id)` - Fetch a specific task by ID

#### Mutation Hooks
- `useCreateTask(projectId)` - Create a new task with optimistic updates
- `useUpdateTask(projectId)` - Update an existing task
- `useMoveTask(projectId)` - Move a task between columns (drag & drop)
- `useDeleteTask(projectId)` - Delete a task

#### Real-time Support
- `useTaskRealTimeUpdates(projectId)` - Provides handlers for Socket.io real-time updates
  - `handleTaskUpdate(task)` - Update task in cache
  - `handleTaskCreate(task)` - Add new task to cache
  - `handleTaskDelete(taskId)` - Remove task from cache

### Users Hooks (`useUsers.ts`)

#### Query Hooks
- `useUserProfile()` - Fetch current user's profile
- `useUserSearch(params)` - Search users with query parameters
- `useDebouncedUserSearch(query, delay)` - Debounced user search for better UX
- `useUsersByIds(userIds)` - Fetch multiple users by their IDs (with caching optimization)

#### Mutation Hooks
- `useUpdateUserProfile()` - Update current user's profile

#### Utility Hooks
- `usePrefetchUser()` - Prefetch user data for hover cards, etc.

## Features

### Optimistic Updates
All mutation hooks implement optimistic updates to provide immediate feedback to users:
- Temporary data is shown immediately
- Real server response replaces temporary data
- Automatic rollback on errors

### Error Handling
- Consistent error handling across all hooks
- User-friendly error messages via toast notifications
- Automatic retry logic with configurable retry conditions
- Graceful fallback for network issues

### Caching Strategy
- Intelligent cache invalidation
- Background updates for stale data
- Proper cache cleanup on deletions
- Shared cache between related queries

### Real-time Integration
- Socket.io integration for live updates
- Cache synchronization without full refetches
- Conflict resolution for simultaneous edits

## Usage Examples

### Basic Query
```typescript
import { useProjects } from '@/hooks';

function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {projects?.map(project => (
        <div key={project._id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Mutation with Optimistic Updates
```typescript
import { useCreateProject } from '@/hooks';

function CreateProjectForm() {
  const createProject = useCreateProject();
  
  const handleSubmit = (data) => {
    createProject.mutate(data, {
      onSuccess: () => {
        // Project was created successfully
        // Cache is automatically updated
      },
      onError: (error) => {
        // Handle error (automatic rollback already happened)
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button 
        type="submit" 
        disabled={createProject.isPending}
      >
        {createProject.isPending ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}
```

### Real-time Updates
```typescript
import { useTaskRealTimeUpdates } from '@/hooks';
import { useSocket } from '@/hooks/useSocket';

function TaskBoard({ projectId }) {
  const { handleTaskUpdate, handleTaskCreate, handleTaskDelete } = useTaskRealTimeUpdates(projectId);
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('taskUpdated', handleTaskUpdate);
    socket.on('taskCreated', handleTaskCreate);
    socket.on('taskDeleted', handleTaskDelete);
    
    return () => {
      socket.off('taskUpdated', handleTaskUpdate);
      socket.off('taskCreated', handleTaskCreate);
      socket.off('taskDeleted', handleTaskDelete);
    };
  }, [socket, handleTaskUpdate, handleTaskCreate, handleTaskDelete]);
  
  // Component renders tasks from cache, automatically updated via socket
}
```

### Debounced Search
```typescript
import { useDebouncedUserSearch } from '@/hooks';

function UserSearchInput() {
  const [query, setQuery] = useState('');
  const { data: users, isLoading } = useDebouncedUserSearch(query, 300);
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {isLoading && <div>Searching...</div>}
      {users?.map(user => (
        <div key={user._id}>{user.name}</div>
      ))}
    </div>
  );
}
```

## Testing

The hooks are tested with:
- Unit tests for individual hook functionality
- Integration tests for hook interactions
- Mock implementations for API calls
- Error scenario testing
- Optimistic update testing

Run tests with:
```bash
npm test -- --testPathPattern="hooks"
```

## Configuration

The hooks use shared configuration from:
- `@/lib/queryClient.ts` - React Query client configuration
- `@/lib/query-utils.ts` - Shared utilities and query keys
- `@/types/api.ts` - TypeScript type definitions

## Backend Integration

The hooks expect the following API endpoints:

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/projects/:id/tasks` - List project tasks
- `POST /api/projects/:id/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/move` - Move task
- `DELETE /api/tasks/:id` - Delete task

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search` - Search users
- `POST /api/users/batch` - Get multiple users by IDs
- `GET /api/users/:id` - Get user by ID

All endpoints should return responses in the format:
```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```
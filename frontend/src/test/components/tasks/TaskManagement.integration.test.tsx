import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockFetch } from '@/test/utils/test-utils';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import { Task, Project, User, ApiResponse } from '@/types/api';

// Mock the hooks to use real implementations with mocked fetch
jest.unmock('@/hooks/useTasks');
jest.unmock('@/hooks/useProjects');

// Mock useUsers hook specifically
jest.mock('@/hooks/useUsers', () => ({
  useUsers: jest.fn(() => ({
    data: [
      {
        _id: 'user1',
        email: 'user1@example.com',
        name: 'John Doe',
        avatar: undefined,
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        _id: 'user2',
        email: 'user2@example.com',
        name: 'Jane Smith',
        avatar: undefined,
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ],
    isLoading: false,
  })),
}));

const mockProjects: Project[] = [
  {
    _id: 'project1',
    name: 'Test Project',
    description: 'Test Description',
    owner: 'user1',
    members: ['user1', 'user2'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const mockTasks: Task[] = [
  {
    _id: 'task1',
    title: 'Todo Task',
    description: 'Todo Description',
    status: 'todo',
    priority: 'high',
    assignee: 'user1',
    project: 'project1',
    position: 0,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'task2',
    title: 'In Progress Task',
    description: 'In Progress Description',
    status: 'inprogress',
    priority: 'medium',
    assignee: 'user2',
    project: 'project1',
    position: 0,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const mockUsers: User[] = [
  {
    _id: 'user1',
    email: 'user1@example.com',
    name: 'John Doe',
    avatar: undefined,
    role: 'user',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'user2',
    email: 'user2@example.com',
    name: 'Jane Smith',
    avatar: undefined,
    role: 'user',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

describe('Task Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    global.fetch = jest.fn((url: string, options?: any) => {
      const method = options?.method || 'GET';
      
      if (url === '/api/projects' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockProjects,
          } as ApiResponse<Project[]>),
        });
      }
      
      if (url === '/api/projects/project1/tasks' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockTasks,
          } as ApiResponse<Task[]>),
        });
      }
      
      if (url === '/api/users/search' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockUsers,
          } as ApiResponse<User[]>),
        });
      }
      
      if (url === '/api/projects/project1/tasks' && method === 'POST') {
        const newTask: Task = {
          _id: 'new-task',
          title: JSON.parse(options.body).title,
          description: JSON.parse(options.body).description,
          status: JSON.parse(options.body).status || 'todo',
          priority: JSON.parse(options.body).priority || 'medium',
          assignee: JSON.parse(options.body).assignee,
          project: 'project1',
          position: mockTasks.length,
          createdBy: 'user1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: newTask,
          } as ApiResponse<Task>),
        });
      }
      
      if (url.startsWith('/api/tasks/') && method === 'PUT') {
        const taskId = url.split('/')[3];
        const updates = JSON.parse(options.body);
        const updatedTask = {
          ...mockTasks.find(t => t._id === taskId)!,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: updatedTask,
          } as ApiResponse<Task>),
        });
      }
      
      if (url.startsWith('/api/tasks/') && method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
          } as ApiResponse),
        });
      }
      
      return Promise.reject(new Error(`Unhandled request: ${method} ${url}`));
    }) as jest.Mock;
  });

  it('renders complete task management interface', async () => {
    render(<ProjectBoard projectId="project1" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Check columns are rendered
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    // Check tasks are rendered in correct columns
    expect(screen.getByText('Todo Task')).toBeInTheDocument();
    expect(screen.getByText('In Progress Task')).toBeInTheDocument();

    // Check project selector and add task button
    expect(screen.getByTestId('project-selector-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('creates a new task through the modal', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard projectId="project1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Open create task modal
    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'New Integration Task');
    await user.type(screen.getByLabelText(/description/i), 'New task description');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await user.selectOptions(screen.getByLabelText(/assignee/i), 'user1');

    // Submit
    await user.click(screen.getByRole('button', { name: /create task/i }));

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project1/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Integration Task',
            description: 'New task description',
            status: 'todo',
            priority: 'high',
            assignee: 'user1',
            dueDate: undefined,
          }),
        })
      );
    });
  });

  it('edits an existing task', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard projectId="project1" />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
    });

    // Click on task to edit
    const taskCard = screen.getByTestId('task-card-task1');
    await user.click(taskCard);

    expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todo Task')).toBeInTheDocument();

    // Update title
    const titleInput = screen.getByDisplayValue('Todo Task');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Todo Task');

    // Submit
    await user.click(screen.getByRole('button', { name: /update task/i }));

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tasks/task1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Updated Todo Task'),
        })
      );
    });
  });

  it('deletes a task', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true),
    });

    render(<ProjectBoard projectId="project1" />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
    });

    // Click delete button on task
    const deleteButton = screen.getAllByTitle('Delete task')[0];
    await user.click(deleteButton);

    // Verify confirmation was shown
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tasks/task1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('switches between projects', async () => {
    const user = userEvent.setup();
    const onProjectChange = jest.fn();

    render(<ProjectBoard projectId="project1" onProjectChange={onProjectChange} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Open project selector
    const selectorButton = screen.getByTestId('project-selector-button');
    await user.click(selectorButton);

    // Select project (same project in this case, but tests the interaction)
    const projectOption = screen.getByTestId('project-option-project1');
    await user.click(projectOption);

    expect(onProjectChange).toHaveBeenCalledWith('project1');
  });

  it('handles form validation in task modal', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard projectId="project1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Open create task modal
    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    // Try to submit without title
    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(screen.getByText('Title is required')).toBeInTheDocument();

    // Add title and submit successfully
    await user.type(screen.getByLabelText(/title/i), 'Valid Task');
    await user.click(screen.getByRole('button', { name: /create task/i }));

    // Error should be gone and API should be called
    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('displays task counts in column headers', async () => {
    render(<ProjectBoard projectId="project1" />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
    });

    // Check task counts (1 todo, 1 in progress, 0 done)
    // Look for the count badges in the column headers
    const todoHeader = screen.getByText('To Do').closest('div');
    const inProgressHeader = screen.getByText('In Progress').closest('div');
    const doneHeader = screen.getByText('Done').closest('div');

    expect(todoHeader).toHaveTextContent('1');
    expect(inProgressHeader).toHaveTextContent('1');
    expect(doneHeader).toHaveTextContent('0');
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Server error' },
        }),
      })
    ) as jest.Mock;

    render(<ProjectBoard projectId="project1" />);

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
  });
});
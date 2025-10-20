import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockFetch, mockFetchError } from '@/test/utils/test-utils';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import { Task, Project } from '@/types/api';

// Mock the hooks
jest.mock('@/hooks/useTasks');
jest.mock('@/hooks/useProjects');
jest.mock('@/hooks/useUsers');

const mockUseTasks = require('@/hooks/useTasks').useTasks as jest.Mock;
const mockUseProjects = require('@/hooks/useProjects').useProjects as jest.Mock;
const mockUseDeleteTask = require('@/hooks/useTasks').useDeleteTask as jest.Mock;
const mockUseUsers = require('@/hooks/useUsers').useUsers as jest.Mock;

const mockTasks: Task[] = [
  {
    _id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'todo',
    priority: 'high',
    assignee: undefined,
    project: 'project1',
    position: 0,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'inprogress',
    priority: 'medium',
    assignee: undefined,
    project: 'project1',
    position: 0,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: '3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'done',
    priority: 'low',
    assignee: undefined,
    project: 'project1',
    position: 0,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const mockProjects: Project[] = [
  {
    _id: 'project1',
    name: 'Test Project',
    description: 'Test Description',
    owner: 'user1',
    members: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

describe('ProjectBoard', () => {
  const defaultProps = {
    projectId: 'project1',
    onProjectChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });
    mockUseDeleteTask.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseUsers.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders loading state', () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<ProjectBoard {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = new Error('Failed to load tasks');
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error,
    });

    render(<ProjectBoard {...defaultProps} />);

    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('renders task columns with correct tasks', () => {
    render(<ProjectBoard {...defaultProps} />);

    // Check column headers
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    // Check tasks are in correct columns
    const todoColumn = screen.getByTestId('task-column-todo');
    const inProgressColumn = screen.getByTestId('task-column-inprogress');
    const doneColumn = screen.getByTestId('task-column-done');

    expect(todoColumn).toContainElement(screen.getByTestId('task-card-1'));
    expect(inProgressColumn).toContainElement(screen.getByTestId('task-card-2'));
    expect(doneColumn).toContainElement(screen.getByTestId('task-card-3'));
  });

  it('opens task modal when Add Task button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });

  it('opens task modal for editing when task is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard {...defaultProps} />);

    const taskCard = screen.getByTestId('task-card-1');
    await user.click(taskCard);

    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument();
  });

  it('closes task modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectBoard {...defaultProps} />);

    // Open modal
    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByText('Create Task')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
    });
  });

  it('renders project selector', () => {
    render(<ProjectBoard {...defaultProps} />);

    expect(screen.getByTestId('project-selector-button')).toBeInTheDocument();
  });

  it('calls onProjectChange when project is changed', async () => {
    const user = userEvent.setup();
    const onProjectChange = jest.fn();
    
    render(<ProjectBoard {...defaultProps} onProjectChange={onProjectChange} />);

    const selectorButton = screen.getByTestId('project-selector-button');
    await user.click(selectorButton);

    const projectOption = screen.getByTestId('project-option-project1');
    await user.click(projectOption);

    expect(onProjectChange).toHaveBeenCalledWith('project1');
  });

  it('renders empty state when no tasks', () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<ProjectBoard {...defaultProps} />);

    const todoColumn = screen.getByTestId('task-column-todo');
    expect(todoColumn).toHaveTextContent('No tasks');
  });

  it('groups tasks by status correctly', () => {
    render(<ProjectBoard {...defaultProps} />);

    // Check task counts in column headers
    const todoColumn = screen.getByTestId('task-column-todo');
    const inProgressColumn = screen.getByTestId('task-column-inprogress');
    const doneColumn = screen.getByTestId('task-column-done');

    expect(todoColumn).toHaveTextContent('1'); // 1 todo task
    expect(inProgressColumn).toHaveTextContent('1'); // 1 in progress task
    expect(doneColumn).toHaveTextContent('1'); // 1 done task
  });
});
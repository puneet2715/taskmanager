import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task, User } from '@/types/api';

// Mock the hooks
jest.mock('@/hooks/useTasks');
jest.mock('@/hooks/useAI');

const mockUseDeleteTask = require('@/hooks/useTasks').useDeleteTask as jest.Mock;
const mockUseAIAvailability = require('@/hooks/useAI').useAIAvailability as jest.Mock;

const mockUser: User = {
  _id: 'user1',
  email: 'user@example.com',
  name: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockTask: Task = {
  _id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'high',
  assignee: mockUser,
  project: 'project1',
  position: 0,
  dueDate: '2023-12-31T00:00:00Z',
  createdBy: 'user1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('TaskCard', () => {
  const defaultProps = {
    task: mockTask,
    projectId: 'project1',
    onEdit: jest.fn(),
  };

  const mockDeleteMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteTask.mockReturnValue(mockDeleteMutation);
    mockUseAIAvailability.mockReturnValue({
      isAvailable: true,
      isLoading: false,
      quotaRemaining: 10,
      quotaLimit: 100,
      requestsToday: 5,
      hasQuota: true,
    });
    
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true),
    });
  });

  it('renders task information correctly', () => {
    render(<TaskCard {...defaultProps} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(/Due: 12\/31\/2023/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onEdit when card is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    render(<TaskCard {...defaultProps} onEdit={onEdit} />);

    const card = screen.getByTestId('task-card-1');
    await user.click(card);

    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    render(<TaskCard {...defaultProps} onEdit={onEdit} />);

    const editButton = screen.getByTitle('Edit task');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalled();
  });

  it('shows delete confirmation and deletes task', async () => {
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete task');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');
    expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith('1');
  });

  it('does not delete task when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(<TaskCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete task');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows loading state during delete', () => {
    mockUseDeleteTask.mockReturnValue({
      ...mockDeleteMutation,
      isPending: true,
    });

    render(<TaskCard {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disables delete button during delete', () => {
    mockUseDeleteTask.mockReturnValue({
      ...mockDeleteMutation,
      isPending: true,
    });

    render(<TaskCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete task');
    expect(deleteButton).toBeDisabled();
  });

  it('renders priority colors correctly', () => {
    const highPriorityTask = { ...mockTask, priority: 'high' as const };
    const { rerender } = render(<TaskCard {...defaultProps} task={highPriorityTask} />);

    expect(screen.getByText('High')).toHaveClass('bg-red-100', 'text-red-800');

    const mediumPriorityTask = { ...mockTask, priority: 'medium' as const };
    rerender(<TaskCard {...defaultProps} task={mediumPriorityTask} />);

    expect(screen.getByText('Medium')).toHaveClass('bg-yellow-100', 'text-yellow-800');

    const lowPriorityTask = { ...mockTask, priority: 'low' as const };
    rerender(<TaskCard {...defaultProps} task={lowPriorityTask} />);

    expect(screen.getByText('Low')).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders without assignee', () => {
    const taskWithoutAssignee = { ...mockTask, assignee: undefined };
    render(<TaskCard {...defaultProps} task={taskWithoutAssignee} />);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('renders without description', () => {
    const taskWithoutDescription = { ...mockTask, description: undefined };
    render(<TaskCard {...defaultProps} task={taskWithoutDescription} />);

    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
  });

  it('renders without due date', () => {
    const taskWithoutDueDate = { ...mockTask, dueDate: undefined };
    render(<TaskCard {...defaultProps} task={taskWithoutDueDate} />);

    expect(screen.queryByText(/Due:/)).not.toBeInTheDocument();
  });

  it('renders assignee avatar when available', () => {
    render(<TaskCard {...defaultProps} />);

    const avatar = screen.getByAltText('John Doe');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders assignee initials when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };
    const taskWithUserWithoutAvatar = { ...mockTask, assignee: userWithoutAvatar };
    
    render(<TaskCard {...defaultProps} task={taskWithUserWithoutAvatar} />);

    expect(screen.getByText('J')).toBeInTheDocument(); // First letter of name
  });

  it('handles string assignee ID', () => {
    const taskWithStringAssignee = { ...mockTask, assignee: 'user1' };
    render(<TaskCard {...defaultProps} task={taskWithStringAssignee} />);

    expect(screen.getByText('U')).toBeInTheDocument(); // First letter of "Unknown User"
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('handles delete error gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockDeleteMutation.mutateAsync.mockRejectedValue(new Error('Delete failed'));

    render(<TaskCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete task');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to delete task:', expect.any(Error));
    });

    consoleError.mockRestore();
  });
});
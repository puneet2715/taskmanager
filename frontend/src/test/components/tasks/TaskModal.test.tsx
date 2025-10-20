import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task, User } from '@/types/api';

// Mock the hooks
jest.mock('@/hooks/useTasks');
jest.mock('@/hooks/useUsers');

const mockUseCreateTask = require('@/hooks/useTasks').useCreateTask as jest.Mock;
const mockUseUpdateTask = require('@/hooks/useTasks').useUpdateTask as jest.Mock;

// Mock useUsers hook
jest.mock('@/hooks/useUsers', () => ({
  useUsers: jest.fn(),
}));

const mockUseUsers = require('@/hooks/useUsers').useUsers as jest.Mock;

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

const mockTask: Task = {
  _id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'inprogress',
  priority: 'high',
  assignee: 'user1',
  project: 'project1',
  position: 0,
  dueDate: '2023-12-31T00:00:00Z',
  createdBy: 'user1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('TaskModal', () => {
  const defaultProps = {
    projectId: 'project1',
    onClose: jest.fn(),
  };

  const mockCreateMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockUpdateMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateTask.mockReturnValue(mockCreateMutation);
    mockUseUpdateTask.mockReturnValue(mockUpdateMutation);
    mockUseUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
  });

  describe('Create Mode', () => {
    it('renders create task modal', () => {
      render(<TaskModal {...defaultProps} />);

      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    });

    it('creates task with valid data', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'New Task');
      await user.type(screen.getByLabelText(/description/i), 'New Description');
      await user.selectOptions(screen.getByLabelText(/status/i), 'inprogress');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
      await user.selectOptions(screen.getByLabelText(/assignee/i), 'user1');
      await user.type(screen.getByLabelText(/due date/i), '2023-12-31');

      // Submit
      await user.click(screen.getByRole('button', { name: /create task/i }));

      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'New Description',
        status: 'inprogress',
        priority: 'high',
        assignee: 'user1',
        dueDate: '2023-12-31',
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Submit without title
      await user.click(screen.getByRole('button', { name: /create task/i }));

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('validates title length', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Enter title that's too long
      const longTitle = 'a'.repeat(101);
      await user.type(screen.getByLabelText(/title/i), longTitle);
      await user.click(screen.getByRole('button', { name: /create task/i }));

      expect(screen.getByText('Title must be less than 100 characters')).toBeInTheDocument();
      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('validates description length', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Enter valid title and long description
      await user.type(screen.getByLabelText(/title/i), 'Valid Title');
      const longDescription = 'a'.repeat(501);
      await user.type(screen.getByLabelText(/description/i), longDescription);
      await user.click(screen.getByRole('button', { name: /create task/i }));

      expect(screen.getByText('Description must be less than 500 characters')).toBeInTheDocument();
      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit task modal with existing data', () => {
      render(<TaskModal {...defaultProps} task={mockTask} />);

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update task/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    });

    it('updates task with changes', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} task={mockTask} />);

      // Change title
      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      // Submit
      await user.click(screen.getByRole('button', { name: /update task/i }));

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: '1',
        updates: {
          title: 'Updated Task',
          description: 'Test Description',
          status: 'inprogress',
          priority: 'high',
          assignee: 'user1',
          dueDate: '2023-12-31',
        },
      });
    });

    it('handles task with user object assignee', () => {
      const taskWithUserAssignee = {
        ...mockTask,
        assignee: mockUsers[0],
      };

      render(<TaskModal {...defaultProps} task={taskWithUserAssignee} />);

      const assigneeSelect = screen.getByLabelText(/assignee/i) as HTMLSelectElement;
      expect(assigneeSelect.value).toBe('user1');
    });
  });

  describe('Form Interactions', () => {
    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TaskModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByLabelText('Close modal'));

      expect(onClose).toHaveBeenCalled();
    });

    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TaskModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TaskModal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });

    it('does not close modal when modal content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TaskModal {...defaultProps} onClose={onClose} />);

      const modalContent = screen.getByRole('dialog');
      await user.click(modalContent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Submit to show error
      await user.click(screen.getByRole('button', { name: /create task/i }));
      expect(screen.getByText('Title is required')).toBeInTheDocument();

      // Start typing to clear error
      await user.type(screen.getByLabelText(/title/i), 'New Title');

      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });

    it('renders user options in assignee select', () => {
      render(<TaskModal {...defaultProps} />);

      const assigneeSelect = screen.getByLabelText(/assignee/i);
      expect(assigneeSelect).toHaveTextContent('John Doe (user1@example.com)');
      expect(assigneeSelect).toHaveTextContent('Jane Smith (user2@example.com)');
    });

    it('handles optional fields correctly', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      // Fill only required field
      await user.type(screen.getByLabelText(/title/i), 'Minimal Task');

      // Submit
      await user.click(screen.getByRole('button', { name: /create task/i }));

      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        title: 'Minimal Task',
        description: undefined,
        status: 'todo',
        priority: 'medium',
        assignee: undefined,
        dueDate: undefined,
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during create', async () => {
      const user = userEvent.setup();
      mockUseCreateTask.mockReturnValue({
        ...mockCreateMutation,
        isPending: true,
      });

      render(<TaskModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), 'New Task');
      // The button text should show "Creating..." when isPending is true
      expect(screen.getByText('Creating...')).toBeInTheDocument();

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('shows loading state during update', async () => {
      const user = userEvent.setup();
      mockUseUpdateTask.mockReturnValue({
        ...mockUpdateMutation,
        isPending: true,
      });

      render(<TaskModal {...defaultProps} task={mockTask} />);

      // The button text should show "Updating..." when isPending is true
      expect(screen.getByText('Updating...')).toBeInTheDocument();

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles create error', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockCreateMutation.mutateAsync.mockRejectedValue(new Error('Create failed'));

      render(<TaskModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), 'New Task');
      await user.click(screen.getByRole('button', { name: /create task/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to save task. Please try again.')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('handles update error', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockUpdateMutation.mutateAsync.mockRejectedValue(new Error('Update failed'));

      render(<TaskModal {...defaultProps} task={mockTask} />);

      await user.click(screen.getByRole('button', { name: /update task/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to save task. Please try again.')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });
});
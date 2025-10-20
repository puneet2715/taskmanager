import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { TaskColumn } from '@/components/tasks/TaskColumn';
import { Task } from '@/types/api';

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
    status: 'todo',
    priority: 'medium',
    assignee: undefined,
    project: 'project1',
    position: 1,
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

describe('TaskColumn', () => {
  const defaultProps = {
    status: 'todo' as const,
    title: 'To Do',
    tasks: mockTasks,
    projectId: 'project1',
    onEditTask: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders column header with title and task count', () => {
    render(<TaskColumn {...defaultProps} />);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Task count
  });

  it('renders all tasks in the column', () => {
    render(<TaskColumn {...defaultProps} />);

    expect(screen.getByTestId('task-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-2')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', () => {
    render(<TaskColumn {...defaultProps} tasks={[]} />);

    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Task count
  });

  it('applies custom className', () => {
    render(<TaskColumn {...defaultProps} className="bg-blue-100" />);

    const columnHeader = screen.getByText('To Do').closest('.bg-blue-100');
    expect(columnHeader).toHaveClass('bg-blue-100');
  });

  it('calls onEditTask when task is clicked', async () => {
    const user = userEvent.setup();
    const onEditTask = jest.fn();

    render(<TaskColumn {...defaultProps} onEditTask={onEditTask} />);

    const taskCard = screen.getByTestId('task-card-1');
    await user.click(taskCard);

    expect(onEditTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('renders tasks in correct order by position', () => {
    const tasksOutOfOrder = [mockTasks[1], mockTasks[0]]; // Position 1, then 0
    render(<TaskColumn {...defaultProps} tasks={tasksOutOfOrder} />);

    const taskCards = screen.getAllByTestId(/task-card-/);
    // Tasks should be sorted by position, so task with position 0 comes first
    expect(taskCards[0]).toHaveAttribute('data-testid', 'task-card-1'); // Position 0
    expect(taskCards[1]).toHaveAttribute('data-testid', 'task-card-2'); // Position 1
  });

  it('has correct test id for column', () => {
    render(<TaskColumn {...defaultProps} />);

    expect(screen.getByTestId('task-column-todo')).toBeInTheDocument();
  });

  it('renders with different status', () => {
    render(
      <TaskColumn
        {...defaultProps}
        status="inprogress"
        title="In Progress"
      />
    );

    expect(screen.getByTestId('task-column-inprogress')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import { Task } from '@/types/api';
import { useTasks, useMoveTask } from '@/hooks/useTasks';

// Mock the hooks
const mockMutateAsync = jest.fn();

jest.mock('@/hooks/useTasks', () => ({
  useTasks: jest.fn(() => ({
    data: [
      {
        _id: 'task1',
        title: 'Todo Task',
        description: 'Todo Description',
        status: 'todo',
        priority: 'medium',
        position: 0,
        project: 'project1',
        createdBy: 'user1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        _id: 'task2',
        title: 'In Progress Task',
        description: 'In Progress Description',
        status: 'inprogress',
        priority: 'high',
        position: 0,
        project: 'project1',
        createdBy: 'user1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        _id: 'task3',
        title: 'Done Task',
        description: 'Done Description',
        status: 'done',
        priority: 'low',
        position: 0,
        project: 'project1',
        createdBy: 'user1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ] as Task[],
    isLoading: false,
    error: null,
  })),
  useMoveTask: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

jest.mock('@/hooks/useProjects', () => ({
  useProjects: jest.fn(() => ({
    data: [
      {
        _id: 'project1',
        name: 'Test Project',
        description: 'Test Description',
        owner: 'user1',
        members: ['user1'],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock DnD Kit
const mockDragStart = jest.fn();
const mockDragEnd = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children, onDragStart, onDragEnd, ...props }: any) => {
    mockDragStart.mockImplementation(onDragStart);
    mockDragEnd.mockImplementation(onDragEnd);
    return <div data-testid="dnd-context" {...props}>{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  closestCorners: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: unknown) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: { role: 'button', tabIndex: 0 },
    listeners: { onPointerDown: jest.fn() },
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

describe('Drag and Drop Functionality', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('renders drag handles on task cards', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Check that drag handles are present
    const dragHandles = screen.getAllByTitle('Drag to move task');
    expect(dragHandles).toHaveLength(3);
  });

  it('renders droppable columns', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Check that all columns are present
    expect(screen.getByTestId('task-column-todo')).toBeInTheDocument();
    expect(screen.getByTestId('task-column-inprogress')).toBeInTheDocument();
    expect(screen.getByTestId('task-column-done')).toBeInTheDocument();
  });

  it('renders draggable task cards', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Check that task cards are present and have drag attributes
    const taskCard1 = screen.getByTestId('task-card-task1');
    const taskCard2 = screen.getByTestId('task-card-task2');
    const taskCard3 = screen.getByTestId('task-card-task3');

    expect(taskCard1).toBeInTheDocument();
    expect(taskCard2).toBeInTheDocument();
    expect(taskCard3).toBeInTheDocument();

    // Check that they have the necessary drag attributes
    expect(taskCard1).toHaveAttribute('role', 'button');
    expect(taskCard2).toHaveAttribute('role', 'button');
    expect(taskCard3).toHaveAttribute('role', 'button');
  });

  it('handles drag start event correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag start
    const dragStartEvent = {
      active: { id: 'task1' },
    };

    mockDragStart(dragStartEvent);

    // Check that drag overlay is rendered
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('handles drag end event and calls move task API', async () => {
    mockMutateAsync.mockResolvedValue({
      _id: 'task1',
      title: 'Todo Task',
      status: 'inprogress',
      position: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag end - moving task1 from todo to inprogress column
    const dragEndEvent = {
      active: { id: 'task1' },
      over: { id: 'column-inprogress' },
    };

    await mockDragEnd(dragEndEvent);

    // Check that move task mutation was called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 1, // Should be at the end of inprogress column
        },
      });
    });
  });

  it('handles drag end event when dropping over another task', async () => {
    mockMutateAsync.mockResolvedValue({
      _id: 'task1',
      title: 'Todo Task',
      status: 'inprogress',
      position: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag end - dropping task1 over task2
    const dragEndEvent = {
      active: { id: 'task1' },
      over: { id: 'task2' },
    };

    await mockDragEnd(dragEndEvent);

    // Check that move task mutation was called with correct position
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'task1',
        moveData: {
          status: 'inprogress',
          position: 0, // Should be at the position of task2
        },
      });
    });
  });

  it('does not call move task API when task is dropped in same position', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag end - dropping task1 in same column at same position
    const dragEndEvent = {
      active: { id: 'task1' },
      over: { id: 'column-todo' },
    };

    await mockDragEnd(dragEndEvent);

    // Check that move task mutation was NOT called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('handles drag end event when no drop target', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag end with no drop target
    const dragEndEvent = {
      active: { id: 'task1' },
      over: null,
    };

    await mockDragEnd(dragEndEvent);

    // Check that move task mutation was NOT called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('handles move task API error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMutateAsync.mockRejectedValue(new Error('Network error'));

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag end
    const dragEndEvent = {
      active: { id: 'task1' },
      over: { id: 'column-inprogress' },
    };

    await mockDragEnd(dragEndEvent);

    // Check that error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to move task:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('shows loading state during drag operation', () => {
    const { useMoveTask } = require('@/hooks/useTasks');
    useMoveTask.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Simulate drag start
    const dragStartEvent = {
      active: { id: 'task1' },
    };

    mockDragStart(dragStartEvent);

    // Check that drag in progress state is applied
    const dndContext = screen.getByTestId('dnd-context');
    expect(dndContext.querySelector('.select-none')).toBeInTheDocument();
  });
});
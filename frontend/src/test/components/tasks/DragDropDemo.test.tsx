import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import { Task } from '@/types/api';

// Mock the hooks
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
    ] as Task[],
    isLoading: false,
    error: null,
  })),
  useMoveTask: jest.fn(() => ({
    mutateAsync: jest.fn(),
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

describe('Drag and Drop Implementation Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('successfully implements @dnd-kit drag and drop functionality', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Verify DndContext is working (accessibility features are present)
    expect(screen.getByText(/To pick up a draggable item, press the space bar/)).toBeInTheDocument();
    
    // Verify drag handles are present
    const dragHandles = screen.getAllByTitle('Drag to move task');
    expect(dragHandles).toHaveLength(2);
    
    // Verify task cards have sortable attributes
    const taskCards = screen.getAllByRole('button');
    const draggableCards = taskCards.filter(card => 
      card.getAttribute('aria-roledescription') === 'sortable'
    );
    expect(draggableCards).toHaveLength(2);
    
    // Verify columns are droppable (they have the proper structure)
    expect(screen.getByTestId('task-column-todo')).toBeInTheDocument();
    expect(screen.getByTestId('task-column-inprogress')).toBeInTheDocument();
    expect(screen.getByTestId('task-column-done')).toBeInTheDocument();
    
    // Verify tasks are in correct columns
    const todoColumn = screen.getByTestId('task-column-todo');
    const inProgressColumn = screen.getByTestId('task-column-inprogress');
    
    expect(todoColumn).toHaveTextContent('Todo Task');
    expect(inProgressColumn).toHaveTextContent('In Progress Task');
  });

  it('has proper drag and drop structure', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Check that DragOverlay container exists (for drag preview)
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    
    // Check that drag instructions are available for accessibility
    const instructions = screen.getByText(/To pick up a draggable item/);
    expect(instructions).toBeInTheDocument();
  });
});
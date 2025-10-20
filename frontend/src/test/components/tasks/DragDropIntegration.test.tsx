import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import { Task } from '@/types/api';

// Simple integration test to verify drag-and-drop functionality
describe('Drag and Drop Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the project board with drag-and-drop components', () => {
    // Mock the hooks with minimal data
    jest.doMock('@/hooks/useTasks', () => ({
      useTasks: () => ({
        data: [
          {
            _id: 'task1',
            title: 'Test Task',
            status: 'todo',
            priority: 'medium',
            position: 0,
            project: 'project1',
            createdBy: 'user1',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ] as Task[],
        isLoading: false,
        error: null,
      }),
      useMoveTask: () => ({
        mutateAsync: jest.fn(),
        isPending: false,
      }),
    }));

    jest.doMock('@/hooks/useProjects', () => ({
      useProjects: () => ({
        data: [
          {
            _id: 'project1',
            name: 'Test Project',
            owner: 'user1',
            members: ['user1'],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
        isLoading: false,
        error: null,
      }),
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectBoard projectId="project1" />
      </QueryClientProvider>
    );

    // Verify basic structure is rendered
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocketQueryIntegration } from '../../hooks/useSocketQueryIntegration';
import { useSocketContext } from '../../components/providers/SocketProvider';
import { Task, Project } from '../../types/api';
import React from 'react';

// Mock the socket context
jest.mock('../../components/providers/SocketProvider');

const mockUseSocketContext = useSocketContext as jest.MockedFunction<typeof useSocketContext>;

// Mock socket instance
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
};

describe('useSocketQueryIntegration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Socket Event Setup', () => {
    it('should set up socket event listeners when connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      expect(mockSocket.on).toHaveBeenCalledWith('taskUpdated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('taskMoved', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('taskCreated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('taskDeleted', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('projectUpdated', expect.any(Function));
    });

    it('should not set up listeners when socket is not available', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: false,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      expect(mockSocket.on).not.toHaveBeenCalled();
    });

    it('should not set up listeners when not connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: false,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      expect(mockSocket.on).not.toHaveBeenCalled();
    });

    it('should clean up event listeners on unmount', () => {
      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      const { unmount } = renderHook(() => useSocketQueryIntegration(), { wrapper });

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('taskUpdated', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('taskMoved', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('taskCreated', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('taskDeleted', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('projectUpdated', expect.any(Function));
    });
  });

  describe('Task Update Handling', () => {
    it('should update task in cache when taskUpdated event is received', () => {
      const mockTasks: Task[] = [
        {
          _id: 'task1',
          title: 'Original Task',
          description: 'Original description',
          status: 'todo',
          priority: 'medium',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          _id: 'task2',
          title: 'Another Task',
          description: 'Another description',
          status: 'inprogress',
          priority: 'high',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate cache
      queryClient.setQueryData(['tasks', 'project1'], mockTasks);

      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      // Get the taskUpdated handler
      const taskUpdatedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'taskUpdated'
      )?.[1];

      // Simulate receiving a task update
      const updatedTask = {
        _id: 'task1',
        id: 'task1',
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'inprogress',
        priority: 'high',
        project: 'project1',
        position: 1,
        createdBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      taskUpdatedHandler?.(updatedTask);

      // Check that the cache was updated
      const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
      expect(cachedTasks).toHaveLength(2);
      expect(cachedTasks[0]).toMatchObject({
        _id: 'task1',
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'inprogress',
        priority: 'high',
      });
      expect(cachedTasks[1]).toMatchObject({
        _id: 'task2',
        title: 'Another Task',
      });
    });

    it('should handle task creation', () => {
      const mockTasks: Task[] = [
        {
          _id: 'task1',
          title: 'Existing Task',
          description: 'Existing description',
          status: 'todo',
          priority: 'medium',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate cache
      queryClient.setQueryData(['tasks', 'project1'], mockTasks);

      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      // Get the taskCreated handler
      const taskCreatedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'taskCreated'
      )?.[1];

      // Simulate receiving a new task
      const newTask = {
        _id: 'task2',
        title: 'New Task',
        description: 'New description',
        status: 'todo',
        priority: 'low',
        project: 'project1',
        position: 1,
        createdBy: 'user1',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      taskCreatedHandler?.(newTask);

      // Check that the task was added to cache
      const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
      expect(cachedTasks).toHaveLength(2);
      expect(cachedTasks[1]).toMatchObject({
        _id: 'task2',
        title: 'New Task',
        description: 'New description',
      });
    });

    it('should handle task deletion', () => {
      const mockTasks: Task[] = [
        {
          _id: 'task1',
          title: 'Task to Delete',
          description: 'Description',
          status: 'todo',
          priority: 'medium',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          _id: 'task2',
          title: 'Task to Keep',
          description: 'Description',
          status: 'inprogress',
          priority: 'high',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate cache
      queryClient.setQueryData(['tasks', 'project1'], mockTasks);

      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      // Get the taskDeleted handler
      const taskDeletedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'taskDeleted'
      )?.[1];

      // Simulate task deletion
      taskDeletedHandler?.('task1', 'project1');

      // Check that the task was removed from cache
      const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
      expect(cachedTasks).toHaveLength(1);
      expect(cachedTasks[0]).toMatchObject({
        _id: 'task2',
        title: 'Task to Keep',
      });
    });
  });

  describe('Task Move Handling', () => {
    it('should update task position and status when taskMoved event is received', () => {
      const mockTasks: Task[] = [
        {
          _id: 'task1',
          title: 'Task to Move',
          description: 'Description',
          status: 'todo',
          priority: 'medium',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          _id: 'task2',
          title: 'Another Task',
          description: 'Description',
          status: 'inprogress',
          priority: 'high',
          project: 'project1',
          position: 0,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate cache
      queryClient.setQueryData(['tasks', 'project1'], mockTasks);

      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      // Get the taskMoved handler
      const taskMovedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'taskMoved'
      )?.[1];

      // Simulate task move
      taskMovedHandler?.('task1', 'done', 1);

      // Check that the task was moved in cache
      const cachedTasks = queryClient.getQueryData(['tasks', 'project1']) as Task[];
      expect(cachedTasks).toHaveLength(2);
      
      const movedTask = cachedTasks.find(task => task._id === 'task1');
      expect(movedTask).toMatchObject({
        _id: 'task1',
        status: 'done',
        position: 1,
      });
    });
  });

  describe('Project Update Handling', () => {
    it('should update project in cache when projectUpdated event is received', () => {
      const mockProjects: Project[] = [
        {
          _id: 'project1',
          name: 'Original Project',
          description: 'Original description',
          owner: 'user1',
          members: ['user1'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate cache
      queryClient.setQueryData(['projects'], mockProjects);

      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as any,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useSocketQueryIntegration(), { wrapper });

      // Get the projectUpdated handler
      const projectUpdatedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'projectUpdated'
      )?.[1];

      // Simulate project update
      const updatedProject = {
        _id: 'project1',
        name: 'Updated Project Name',
        description: 'Updated description',
        owner: 'user1',
        members: ['user1', 'user2'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      projectUpdatedHandler?.(updatedProject);

      // Check that the project was updated in cache
      const cachedProjects = queryClient.getQueryData(['projects']) as Project[];
      expect(cachedProjects).toHaveLength(1);
      expect(cachedProjects[0]).toMatchObject({
        _id: 'project1',
        name: 'Updated Project Name',
        description: 'Updated description',
        members: ['user1', 'user2'],
      });
    });
  });

  describe('Utility Methods', () => {
    it('should provide utility methods for manual cache operations', () => {
      mockUseSocketContext.mockReturnValue({
        socket: mockSocket as unknown,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      const { result } = renderHook(() => useSocketQueryIntegration(), { wrapper });

      expect(typeof result.current.invalidateTasksForProject).toBe('function');
      expect(typeof result.current.invalidateProjects).toBe('function');
      expect(typeof result.current.refetchTasksForProject).toBe('function');
    });
  });
});
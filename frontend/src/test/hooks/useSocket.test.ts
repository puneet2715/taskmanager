import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import { useSession } from 'next-auth/react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('socket.io-client');
jest.mock('react-hot-toast');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockIo = io as jest.MockedFunction<typeof io>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock socket instance
const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

describe('useSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIo.mockReturnValue(mockSocket as any);
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Socket Connection', () => {
    it('should not connect when session is not available', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      renderHook(() => useSocket());

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should connect when session is available', () => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);

      renderHook(() => useSocket());

      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:5000',
        expect.objectContaining({
          auth: {
            token: 'test-token',
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
        })
      );
    });

    it('should set up event listeners on socket creation', () => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);

      renderHook(() => useSocket());

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('taskUpdated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('taskMoved', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('userJoined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('userLeft', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Socket Events', () => {
    let result: any;

    beforeEach(() => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);
      const { result: hookResult } = renderHook(() => useSocket());
      result = hookResult;
    });

    it('should handle connect event', () => {
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler?.();
      });

      expect(result.current.isConnected).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('Connected to real-time updates');
    });

    it('should handle disconnect event', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      act(() => {
        disconnectHandler?.('transport close');
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectedUsers.size).toBe(0);
      expect(mockToast.error).toHaveBeenCalledWith('Connection lost, attempting to reconnect...');
    });

    it('should handle server disconnect differently', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      act(() => {
        disconnectHandler?.('io server disconnect');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Disconnected from server');
    });

    it('should handle connect_error event', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      act(() => {
        errorHandler?.(new Error('Connection failed'));
      });

      expect(result.current.isConnected).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Failed to connect to real-time updates');
    });

    it('should handle authentication error', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      act(() => {
        errorHandler?.(new Error('Authentication failed'));
      });

      expect(mockToast.error).toHaveBeenCalledWith('Authentication failed. Please refresh the page.');
    });

    it('should handle userJoined event', () => {
      const userJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'userJoined'
      )?.[1];

      const user = { id: 'user-2', email: 'user2@example.com' };
      const projectId = 'project-1';

      act(() => {
        userJoinedHandler?.(user, projectId);
      });

      expect(result.current.connectedUsers.has('user-2')).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('user2@example.com joined the project');
    });

    it('should handle userLeft event', () => {
      const userJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'userJoined'
      )?.[1];
      const userLeftHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'userLeft'
      )?.[1];

      // First add a user
      act(() => {
        userJoinedHandler?.({ id: 'user-2', email: 'user2@example.com' }, 'project-1');
      });

      expect(result.current.connectedUsers.has('user-2')).toBe(true);

      // Then remove the user
      act(() => {
        userLeftHandler?.('user-2', 'project-1');
      });

      expect(result.current.connectedUsers.has('user-2')).toBe(false);
    });

    it('should handle socket error event', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      act(() => {
        errorHandler?.('Test error message');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Socket error: Test error message');
    });
  });

  describe('Socket Actions', () => {
    let result: any;

    beforeEach(() => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);
      const { result: hookResult } = renderHook(() => useSocket());
      result = hookResult;

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      act(() => {
        connectHandler?.();
      });
    });

    it('should emit joinProject event', () => {
      act(() => {
        result.current.joinProject('project-1');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('joinProject', 'project-1');
    });

    it('should emit leaveProject event', () => {
      act(() => {
        result.current.leaveProject('project-1');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('leaveProject', 'project-1');
    });

    it('should emit updateTask event', () => {
      const updates = { title: 'Updated Task', status: 'inprogress' };

      act(() => {
        result.current.updateTask('task-1', updates);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('updateTask', 'task-1', updates);
    });

    it('should emit moveTask event', () => {
      act(() => {
        result.current.moveTask('task-1', 'done', 2);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('moveTask', 'task-1', 'done', 2);
    });

    it('should not emit events when disconnected', () => {
      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      act(() => {
        disconnectHandler?.('transport close');
      });

      jest.clearAllMocks();

      act(() => {
        result.current.joinProject('project-1');
        result.current.updateTask('task-1', {});
        result.current.moveTask('task-1', 'done', 1);
        result.current.leaveProject('project-1');
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);
      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should clean up state on unmount', () => {
      const mockSession = {
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        },
        status: 'authenticated' as const,
        update: jest.fn(),
      };

      mockUseSession.mockReturnValue(mockSession);
      const { result, unmount } = renderHook(() => useSocket());

      // Simulate connection and add users
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      const userJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'userJoined'
      )?.[1];

      act(() => {
        connectHandler?.();
        userJoinedHandler?.({ id: 'user-2', email: 'user2@example.com' }, 'project-1');
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectedUsers.size).toBe(1);

      unmount();

      // Note: We can't test the state after unmount since the component is destroyed
      // But we can verify that disconnect was called
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
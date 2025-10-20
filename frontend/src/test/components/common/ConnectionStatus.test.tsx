import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { ConnectionStatus, useConnectionStatusNotifications } from '@/components/common/ConnectionStatus';
import { useSocketContext } from '@/components/providers/SocketProvider';

// Mock dependencies
jest.mock('@/components/providers/SocketProvider');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseSocketContext = useSocketContext as jest.MockedFunction<typeof useSocketContext>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: false,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(),
    });
  });

  describe('compact mode', () => {
    it('shows disconnected state by default', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows connected state when connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(['user1', 'user2']),
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('detailed mode', () => {
    it('shows detailed disconnected state', () => {
      render(<ConnectionStatus showDetails={true} />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates are unavailable')).toBeInTheDocument();
    });

    it('shows detailed connected state with user count', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(['user1', 'user2']),
      });

      render(<ConnectionStatus showDetails={true} />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('2 online')).toBeInTheDocument();
    });

    it('shows connection time when connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      render(<ConnectionStatus showDetails={true} />);
      
      expect(screen.getByText(/Connected at/)).toBeInTheDocument();
    });
  });

  describe('useConnectionStatusNotifications', () => {
    it('shows success toast when connecting', () => {
      const { rerender } = renderHook(() => useConnectionStatusNotifications());

      // Initially disconnected
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: false,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      rerender();

      // Now connected
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      rerender();

      expect(mockToast.success).toHaveBeenCalledWith('Real-time updates enabled', {
        duration: 3000,
        icon: '🟢',
      });
    });

    it('shows error toast when disconnecting', () => {
      // Start connected
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      const { rerender } = renderHook(() => useConnectionStatusNotifications());

      // Now disconnected
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: false,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      rerender();

      expect(mockToast.error).toHaveBeenCalledWith('Real-time updates disabled', {
        duration: 5000,
        icon: '🔴',
      });
    });

    it('does not show toast on initial render', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      renderHook(() => useConnectionStatusNotifications());

      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });
});
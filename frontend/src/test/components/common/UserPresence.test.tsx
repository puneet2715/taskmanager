import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserPresence, UserPresenceIndicator } from '../../../components/common/UserPresence';
import { useSocketContext } from '../../../components/providers/SocketProvider';

// Mock the socket context
jest.mock('../../../components/providers/SocketProvider');

const mockUseSocketContext = useSocketContext as jest.MockedFunction<typeof useSocketContext>;

describe('UserPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Status', () => {
    it('should show connected status when socket is connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(['user1', 'user2']),
      });

      render(<UserPresence />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('2 active users')).toBeInTheDocument();
    });

    it('should show disconnected status when socket is not connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: false,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      render(<UserPresence />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.queryByText(/active users/)).not.toBeInTheDocument();
    });

    it('should show singular user text when only one user is connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(['user1']),
      });

      render(<UserPresence />);

      expect(screen.getByText('1 active user')).toBeInTheDocument();
    });

    it('should not show user count when no users are connected', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      render(<UserPresence />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.queryByText(/active users/)).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      mockUseSocketContext.mockReturnValue({
        socket: null,
        isConnected: true,
        joinProject: jest.fn(),
        leaveProject: jest.fn(),
        updateTask: jest.fn(),
        moveTask: jest.fn(),
        connectedUsers: new Set(),
      });

      const { container } = render(<UserPresence className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('UserPresenceIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show online indicator when user is connected', () => {
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(['user1', 'user2']),
    });

    const { container } = render(<UserPresenceIndicator userId="user1" />);

    const indicator = container.querySelector('.bg-green-500');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('title', 'Online');
  });

  it('should show offline indicator when user is not connected', () => {
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(['user2']),
    });

    const { container } = render(<UserPresenceIndicator userId="user1" />);

    const indicator = container.querySelector('.bg-gray-400');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('title', 'Offline');
  });

  it('should show pulse animation for online users', () => {
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(['user1']),
    });

    const { container } = render(<UserPresenceIndicator userId="user1" />);

    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).toBeInTheDocument();
  });

  it('should not show pulse animation for offline users', () => {
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(['user2']),
    });

    const { container } = render(<UserPresenceIndicator userId="user1" />);

    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseSocketContext.mockReturnValue({
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(),
    });

    const { container } = render(
      <UserPresenceIndicator userId="user1" className="custom-indicator" />
    );

    expect(container.firstChild).toHaveClass('custom-indicator');
  });
});
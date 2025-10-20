import React from 'react';
import { render, screen } from '@testing-library/react';
import { SocketProvider, useSocketContext } from '../../../components/providers/SocketProvider';
import { useSocket } from '../../../hooks/useSocket';

// Mock the useSocket hook
jest.mock('../../../hooks/useSocket');

const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;

// Test component that uses the socket context
const TestComponent: React.FC = () => {
  const { isConnected, connectedUsers } = useSocketContext();
  
  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="user-count">
        {connectedUsers.size} users
      </div>
    </div>
  );
};

describe('SocketProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide socket context to children', () => {
    const mockSocketData = {
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(['user1', 'user2']),
    };

    mockUseSocket.mockReturnValue(mockSocketData);

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    expect(screen.getByTestId('user-count')).toHaveTextContent('2 users');
  });

  it('should update context when socket state changes', () => {
    const mockSocketData = {
      socket: null,
      isConnected: false,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(),
    };

    mockUseSocket.mockReturnValue(mockSocketData);

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    expect(screen.getByTestId('user-count')).toHaveTextContent('0 users');
  });

  it('should throw error when useSocketContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSocketContext must be used within a SocketProvider');

    consoleSpy.mockRestore();
  });

  it('should provide all socket methods through context', () => {
    const mockSocketData = {
      socket: null,
      isConnected: true,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      updateTask: jest.fn(),
      moveTask: jest.fn(),
      connectedUsers: new Set(),
    };

    mockUseSocket.mockReturnValue(mockSocketData);

    const TestMethodsComponent: React.FC = () => {
      const socketContext = useSocketContext();
      
      return (
        <div>
          <button onClick={() => socketContext.joinProject('project1')}>
            Join Project
          </button>
          <button onClick={() => socketContext.leaveProject('project1')}>
            Leave Project
          </button>
          <button onClick={() => socketContext.updateTask('task1', { title: 'Updated' })}>
            Update Task
          </button>
          <button onClick={() => socketContext.moveTask('task1', 'done', 1)}>
            Move Task
          </button>
        </div>
      );
    };

    render(
      <SocketProvider>
        <TestMethodsComponent />
      </SocketProvider>
    );

    // Verify all methods are available
    expect(screen.getByText('Join Project')).toBeInTheDocument();
    expect(screen.getByText('Leave Project')).toBeInTheDocument();
    expect(screen.getByText('Update Task')).toBeInTheDocument();
    expect(screen.getByText('Move Task')).toBeInTheDocument();
  });
});
// Mock the socketServer import
jest.mock('../../index', () => ({
  socketServer: {
    emitToProject: jest.fn(),
    getConnectedUsers: jest.fn(),
    getConnectedProjectsCount: jest.fn(),
    getTotalConnectedUsers: jest.fn(),
  },
}));

import { SocketService } from '../../services/socketService';
import { socketServer } from '../../index';

const mockSocketServer = socketServer as jest.Mocked<typeof socketServer>;

describe('SocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('emitTaskUpdate', () => {
    it('should emit task update to project', () => {
      const projectId = 'test-project-id';
      const task = {
        id: 'test-task-id',
        title: 'Test Task',
        status: 'inprogress',
      };

      SocketService.emitTaskUpdate(projectId, task);

      expect(mockSocketServer.emitToProject).toHaveBeenCalledWith(
        projectId,
        'taskUpdated',
        task
      );
    });

    it('should handle errors gracefully when socketServer is not available', () => {
      // Temporarily set socketServer to undefined
      const originalSocketServer = require('../../index').socketServer;
      require('../../index').socketServer = undefined;

      expect(() => {
        SocketService.emitTaskUpdate('project-id', { id: 'task-id' });
      }).not.toThrow();

      // Restore original
      require('../../index').socketServer = originalSocketServer;
    });
  });

  describe('emitTaskMove', () => {
    it('should emit task move to project', () => {
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const newStatus = 'done';
      const newPosition = 2;

      SocketService.emitTaskMove(projectId, taskId, newStatus, newPosition);

      expect(mockSocketServer.emitToProject).toHaveBeenCalledWith(
        projectId,
        'taskMoved',
        taskId,
        newStatus,
        newPosition
      );
    });

    it('should handle errors gracefully when socketServer is not available', () => {
      // Temporarily set socketServer to undefined
      const originalSocketServer = require('../../index').socketServer;
      require('../../index').socketServer = undefined;

      expect(() => {
        SocketService.emitTaskMove('project-id', 'task-id', 'done', 1);
      }).not.toThrow();

      // Restore original
      require('../../index').socketServer = originalSocketServer;
    });
  });

  describe('getConnectedUsers', () => {
    it('should return connected users for a project', () => {
      const projectId = 'test-project-id';
      const mockUsers = ['user1', 'user2', 'user3'];

      mockSocketServer.getConnectedUsers.mockReturnValue(mockUsers);

      const result = SocketService.getConnectedUsers(projectId);

      expect(mockSocketServer.getConnectedUsers).toHaveBeenCalledWith(projectId);
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when socketServer is not available', () => {
      // Temporarily set socketServer to undefined
      const originalSocketServer = require('../../index').socketServer;
      require('../../index').socketServer = undefined;

      const result = SocketService.getConnectedUsers('project-id');

      expect(result).toEqual([]);

      // Restore original
      require('../../index').socketServer = originalSocketServer;
    });

    it('should return empty array on error', () => {
      mockSocketServer.getConnectedUsers.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = SocketService.getConnectedUsers('project-id');

      expect(result).toEqual([]);
    });
  });

  describe('getServerStats', () => {
    it('should return server statistics', () => {
      const mockStats = {
        connectedProjects: 5,
        totalUsers: 15,
      };

      mockSocketServer.getConnectedProjectsCount.mockReturnValue(mockStats.connectedProjects);
      mockSocketServer.getTotalConnectedUsers.mockReturnValue(mockStats.totalUsers);

      const result = SocketService.getServerStats();

      expect(mockSocketServer.getConnectedProjectsCount).toHaveBeenCalled();
      expect(mockSocketServer.getTotalConnectedUsers).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return zero stats when socketServer is not available', () => {
      // Temporarily set socketServer to undefined
      const originalSocketServer = require('../../index').socketServer;
      require('../../index').socketServer = undefined;

      const result = SocketService.getServerStats();

      expect(result).toEqual({
        connectedProjects: 0,
        totalUsers: 0,
      });

      // Restore original
      require('../../index').socketServer = originalSocketServer;
    });

    it('should return zero stats on error', () => {
      mockSocketServer.getConnectedProjectsCount.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = SocketService.getServerStats();

      expect(result).toEqual({
        connectedProjects: 0,
        totalUsers: 0,
      });
    });
  });
});
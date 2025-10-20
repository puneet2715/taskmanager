import mongoose from 'mongoose';
import { database, connectDatabase, isDatabaseReady, getDatabaseState } from '../../config/database';

// Mock mongoose to avoid actual database connections
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockMongoose = mongoose as jest.Mocked<typeof mongoose>;

describe('Database Connection', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Reset database connection state
    (database as any).isConnected = false;
    (database as any).connectionAttempts = 0;
  });

  describe('Database Configuration', () => {
    it('should use default MongoDB URI when MONGODB_URI is not set', () => {
      const originalUri = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;
      
      // Access private method through instance for testing
      const config = (database as any).getConfig();
      expect(config.uri).toBe('mongodb://localhost:27017/collaborative-task-manager');
      
      // Restore original value
      if (originalUri) {
        process.env.MONGODB_URI = originalUri;
      }
    });

    it('should use environment variable for MongoDB URI when set', () => {
      const testUri = 'mongodb://test:27017/test-db';
      process.env.MONGODB_URI = testUri;
      
      const config = (database as any).getConfig();
      expect(config.uri).toBe(testUri);
    });

    it('should have proper connection options configured', () => {
      const config = (database as any).getConfig();
      expect(config.options).toEqual({
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
    });
  });

  describe('Connection State Management', () => {
    it('should return correct connection state', () => {
      // Initially disconnected
      expect(getDatabaseState()).toBe('disconnected');
    });

    it('should report connection readiness correctly', () => {
      // Initially not ready
      expect(isDatabaseReady()).toBe(false);
    });

    it('should handle singleton pattern correctly', () => {
      const instance1 = (database as any).constructor.getInstance();
      const instance2 = (database as any).constructor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      // Mock mongoose.connect to always fail
      mockMongoose.connect.mockRejectedValue(new Error('Connection failed'));
      
      // Mock delay to speed up test
      jest.spyOn(database as any, 'delay').mockResolvedValue(undefined);
      
      await expect(connectDatabase()).rejects.toThrow('Failed to connect to database after 5 attempts');
      
      // Should have attempted connection 5 times (max retries)
      expect(mockMongoose.connect).toHaveBeenCalledTimes(5);
    });

    it('should implement retry logic', async () => {
      // Reset connection state to disconnected
      (database as any).isConnected = false;
      
      // Mock mongoose.connect to fail multiple times then succeed
      mockMongoose.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mongoose);

      // Mock delay to speed up test
      jest.spyOn(database as any, 'delay').mockResolvedValue(undefined);

      // This should succeed after retries
      await expect(connectDatabase()).resolves.not.toThrow();
      
      // Should have attempted connection 3 times
      expect(mockMongoose.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle graceful shutdown', async () => {
      // Set connection state to connected
      (database as any).isConnected = true;
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      (mockMongoose.connection.close as jest.Mock).mockResolvedValue(undefined);
      
      try {
        await (database as any).gracefulShutdown();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }
      
      expect(mockMongoose.connection.close).toHaveBeenCalled();
      mockExit.mockRestore();
    });
  });

  describe('Event Handlers', () => {
    it('should set up mongoose event handlers', async () => {
      // Setup event handlers
      (database as any).setupEventHandlers();
      
      expect(mockMongoose.connection.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockMongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });
});
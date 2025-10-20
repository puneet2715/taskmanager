import { createServer } from 'http';
import { SocketServer } from '../../socket/socketServer';

describe('SocketServer', () => {
  let httpServer: any;
  let socketServerInstance: SocketServer;

  beforeAll(() => {
    httpServer = createServer();
    socketServerInstance = new SocketServer(httpServer);
  });

  afterAll(() => {
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('SocketServer Initialization', () => {
    it('should initialize without errors', () => {
      expect(socketServerInstance).toBeDefined();
    });

    it('should have public methods available', () => {
      expect(typeof socketServerInstance.emitToProject).toBe('function');
      expect(typeof socketServerInstance.getConnectedUsers).toBe('function');
      expect(typeof socketServerInstance.getConnectedProjectsCount).toBe('function');
      expect(typeof socketServerInstance.getTotalConnectedUsers).toBe('function');
    });

    it('should return empty arrays and zero counts initially', () => {
      expect(socketServerInstance.getConnectedUsers('test-project')).toEqual([]);
      expect(socketServerInstance.getConnectedProjectsCount()).toBe(0);
      expect(socketServerInstance.getTotalConnectedUsers()).toBe(0);
    });
  });
});
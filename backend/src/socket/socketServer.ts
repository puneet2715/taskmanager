import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { AuthService } from '../services/authService';
import { userPresenceService } from '../controllers/userPresenceController';
import { logger } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
  role: string;
}

export interface ClientToServerEvents {
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  updateTask: (taskId: string, updates: any) => void;
  moveTask: (taskId: string, newStatus: string, newPosition: number) => void;
}

export interface ServerToClientEvents {
  taskUpdated: (task: any) => void;
  taskMoved: (taskId: string, newStatus: string, newPosition: number) => void;
  taskCreated: (task: any) => void;
  taskDeleted: (taskId: string, projectId: string) => void;
  projectUpdated: (project: any) => void;
  userJoined: (user: any, projectId: string) => void;
  userLeft: (userId: string, projectId: string) => void;
  memberRemoved: (removedUserIds: string[], projectId: string) => void;
  error: (message: string) => void;
  presenceSync: (data: { projectId: string; activeUsers: string[]; timestamp: string }) => void;
}

export interface InterServerEvents {
  // Events between server instances (for scaling)
}

export interface SocketData {
  userId: string;
  email: string;
  role: string;
}

import { Socket } from 'socket.io';

export class SocketServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  // Track recent events to prevent duplicates (socketId -> Set of recent event keys)
  private recentEvents: Map<string, Set<string>> = new Map();
  private readonly EVENT_DEDUP_WINDOW = 1000; // 1 second window for deduplication

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        logger.info('Socket connection attempt from:', socket.handshake.address);
        logger.info('Socket handshake auth:', socket.handshake.auth);
        logger.info('Socket handshake headers authorization:', socket.handshake.headers.authorization);

        const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          logger.warn('Socket connection rejected: No authentication token provided');
          return next(new Error('Authentication token required'));
        }

        logger.info('Attempting to verify token for socket connection');
        const decoded = AuthService.verifyToken(token);

        // Attach user data to socket
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;
        socket.data.role = decoded.role;

        logger.info(`Socket authenticated successfully for user: ${decoded.email} (ID: ${decoded.userId})`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        logger.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  private isEventDuplicate(socketId: string, eventKey: string): boolean {
    const socketEvents = this.recentEvents.get(socketId);
    if (!socketEvents) {
      return false;
    }
    return socketEvents.has(eventKey);
  }

  private markEventProcessed(socketId: string, eventKey: string): void {
    if (!this.recentEvents.has(socketId)) {
      this.recentEvents.set(socketId, new Set());
    }

    const socketEvents = this.recentEvents.get(socketId)!;
    socketEvents.add(eventKey);

    // Clean up old events after deduplication window
    setTimeout(() => {
      socketEvents.delete(eventKey);
      if (socketEvents.size === 0) {
        this.recentEvents.delete(socketId);
      }
    }, this.EVENT_DEDUP_WINDOW);
  }



  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      const userEmail = socket.data.email;

      logger.info(`User connected: ${userEmail} (${socket.id})`);

      // Handle joining a project room
      socket.on('joinProject', (projectId: string) => {
        this.handleJoinProject(socket, projectId);
      });

      // Handle leaving a project room
      socket.on('leaveProject', (projectId: string) => {
        this.handleLeaveProject(socket, projectId);
      });

      // Handle task updates
      socket.on('updateTask', (taskId: string, updates: any) => {
        this.handleTaskUpdate(socket, taskId, updates);
      });

      // Handle task moves (drag and drop)
      socket.on('moveTask', (taskId: string, newStatus: string, newPosition: number) => {
        this.handleTaskMove(socket, taskId, newStatus, newPosition);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userEmail}:`, error);
      });
    });
  }

  private handleJoinProject(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, projectId: string): void {
    const userId = socket.data.userId;
    const userEmail = socket.data.email;
    const userRole = socket.data.role;

    try {
      // Create event key for deduplication
      const eventKey = `join:${projectId}:${userId}`;

      // Check for duplicate events
      if (this.isEventDuplicate(socket.id, eventKey)) {
        logger.debug(`Duplicate join event ignored for user ${userEmail} in project ${projectId}`);
        return;
      }

      // Mark event as processed
      this.markEventProcessed(socket.id, eventKey);

      // Join the project room
      socket.join(`project:${projectId}`);

      // Add user connection using UserPresenceService
      const result = userPresenceService.addUserConnection(
        socket.id,
        userId,
        userEmail,
        projectId
      );

      // Send a presence snapshot to the joining user so they see all active users immediately
      try {
        const activeUsers = userPresenceService.getProjectActiveUsers(projectId);
        socket.emit('presenceSync', {
          projectId,
          activeUsers,
          timestamp: new Date().toISOString(),
        });
      } catch (presenceError) {
        logger.warn(`Failed to emit presence snapshot for project ${projectId} to ${userEmail}:`, presenceError);
      }

      // Only notify other users if this is the first connection for this user in this project
      if (result.isFirstConnection) {
        socket.to(`project:${projectId}`).emit('userJoined', {
          id: userId,
          email: userEmail,
          role: userRole,
        }, projectId);

        logger.info(`User ${userEmail} joined project ${projectId} (first connection)`);
      } else {
        logger.info(`User ${userEmail} added additional connection to project ${projectId} (total: ${result.connectionCount})`);
      }
    } catch (error) {
      logger.error(`Error joining project ${projectId}:`, error);
      socket.emit('error', 'Failed to join project');
    }
  }

  private handleLeaveProject(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, projectId: string): void {
    const userId = socket.data.userId;
    const userEmail = socket.data.email;

    try {
      // Create event key for deduplication
      const eventKey = `leave:${projectId}:${userId}`;

      // Check for duplicate events
      if (this.isEventDuplicate(socket.id, eventKey)) {
        logger.debug(`Duplicate leave event ignored for user ${userEmail} in project ${projectId}`);
        return;
      }

      // Mark event as processed
      this.markEventProcessed(socket.id, eventKey);

      // Leave the project room
      socket.leave(`project:${projectId}`);

      // Remove user connection using UserPresenceService
      const result = userPresenceService.removeUserConnection(socket.id);

      if (result.isLastConnection && result.userId && result.projectId) {
        // Notify other users in the project
        socket.to(`project:${projectId}`).emit('userLeft', result.userId, result.projectId);

        logger.info(`User ${userEmail} left project ${projectId} (last connection)`);
      } else if (result.userId && result.projectId) {
        logger.info(`User ${userEmail} removed connection from project ${projectId} (remaining: ${result.connectionCount})`);
      } else {
        logger.warn(`User ${userEmail} tried to leave project ${projectId} but was not tracked as present`);
      }
    } catch (error) {
      logger.error(`Error leaving project ${projectId}:`, error);
      socket.emit('error', 'Failed to leave project');
    }
  }

  private handleTaskUpdate(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, taskId: string, updates: any): void {
    const userEmail = socket.data.email;

    try {
      // Get all project rooms the socket is in
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('project:'));

      // Broadcast task update to all project rooms the user is in
      rooms.forEach(room => {
        socket.to(room).emit('taskUpdated', {
          id: taskId,
          ...updates,
          updatedBy: socket.data.userId,
          updatedAt: new Date().toISOString(),
        });
      });

      logger.info(`Task ${taskId} updated by ${userEmail}`);
    } catch (error) {
      logger.error(`Error updating task ${taskId}:`, error);
      socket.emit('error', 'Failed to update task');
    }
  }

  private handleTaskMove(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, taskId: string, newStatus: string, newPosition: number): void {
    const userEmail = socket.data.email;

    try {
      // Get all project rooms the socket is in
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('project:'));

      // Broadcast task move to all project rooms the user is in
      rooms.forEach(room => {
        socket.to(room).emit('taskMoved', taskId, newStatus, newPosition);
      });

      logger.info(`Task ${taskId} moved to ${newStatus} at position ${newPosition} by ${userEmail}`);
    } catch (error) {
      logger.error(`Error moving task ${taskId}:`, error);
      socket.emit('error', 'Failed to move task');
    }
  }

  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, reason: string): void {
    // const userId = socket.data.userId;
    const userEmail = socket.data.email;

    try {
      // Remove user connection using UserPresenceService
      const result = userPresenceService.removeUserConnection(socket.id);

      if (result.isLastConnection && result.userId && result.projectId) {
        // Notify other users in the project
        socket.to(`project:${result.projectId}`).emit('userLeft', result.userId, result.projectId);

        logger.info(`User ${userEmail} disconnected from project ${result.projectId} (last connection): ${reason}`);
      } else if (result.userId && result.projectId) {
        logger.info(`User ${userEmail} disconnected from project ${result.projectId} (remaining: ${result.connectionCount}): ${reason}`);
      } else {
        logger.warn(`Socket ${socket.id} disconnected without proper mapping for user ${userEmail}: ${reason}`);
      }

      // Clean up recent events for this socket
      this.recentEvents.delete(socket.id);

      logger.info(`User ${userEmail} disconnected: ${reason}`);
    } catch (error) {
      logger.error(`Error handling disconnect for user ${userEmail}:`, error);
    }
  }

  // Public methods for external use
  public emitToProject(projectId: string, event: keyof ServerToClientEvents, ...args: any[]): void {
    this.io.to(`project:${projectId}`).emit(event as any, ...args);
  }

  public getConnectedUsers(projectId: string): string[] {
    return userPresenceService.getProjectActiveUsers(projectId);
  }

  public getConnectedProjectsCount(): number {
    const stats = userPresenceService.getPresenceStats();
    return stats.totalProjects;
  }

  public getTotalConnectedUsers(): number {
    const stats = userPresenceService.getPresenceStats();
    return stats.totalActiveUsers;
  }

  public getUserPresenceInfo(projectId: string): Array<{ userId: string; email: string; role: string; connectionCount: number; lastActivity: Date }> {
    const presence = userPresenceService.getProjectPresence(projectId);

    return Array.from(presence.users.values()).map(state => ({
      userId: state.userId,
      email: state.email,
      role: 'user', // Default role since UserPresenceService doesn't track roles
      connectionCount: state.connectionCount,
      lastActivity: state.lastSeen,
    }));
  }

  public getActiveSocketCount(): number {
    const stats = userPresenceService.getPresenceStats();
    return stats.totalConnections;
  }
}
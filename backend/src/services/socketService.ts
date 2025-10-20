import { socketServer } from '../index';
import { logger } from '../utils/logger';

export class SocketService {
  /**
   * Emit task update to all users in a project
   */
  static emitTaskUpdate(projectId: string, task: any): void {
    try {
      if (socketServer) {
        socketServer.emitToProject(projectId, 'taskUpdated', task);
        logger.info(`Task update emitted to project ${projectId}: ${task.id}`);
      }
    } catch (error) {
      logger.error('Error emitting task update:', error);
    }
  }

  /**
   * Emit task move to all users in a project
   */
  static emitTaskMove(projectId: string, taskId: string, newStatus: string, newPosition: number): void {
    try {
      if (socketServer) {
        socketServer.emitToProject(projectId, 'taskMoved', taskId, newStatus, newPosition);
        logger.info(`Task move emitted to project ${projectId}: ${taskId} -> ${newStatus}:${newPosition}`);
      }
    } catch (error) {
      logger.error('Error emitting task move:', error);
    }
  }

  /**
   * Get connected users for a project
   */
  static getConnectedUsers(projectId: string): string[] {
    try {
      if (socketServer) {
        return socketServer.getConnectedUsers(projectId);
      }
      return [];
    } catch (error) {
      logger.error('Error getting connected users:', error);
      return [];
    }
  }

  /**
   * Emit task creation to all users in a project
   */
  static emitTaskCreate(projectId: string, task: any): void {
    try {
      if (socketServer) {
        socketServer.emitToProject(projectId, 'taskCreated', task);
        logger.info(`Task creation emitted to project ${projectId}: ${task.id}`);
      }
    } catch (error) {
      logger.error('Error emitting task creation:', error);
    }
  }

  /**
   * Emit task deletion to all users in a project
   */
  static emitTaskDelete(projectId: string, taskId: string): void {
    try {
      if (socketServer) {
        socketServer.emitToProject(projectId, 'taskDeleted', taskId, projectId);
        logger.info(`Task deletion emitted to project ${projectId}: ${taskId}`);
      }
    } catch (error) {
      logger.error('Error emitting task deletion:', error);
    }
  }

  /**
   * Emit project update to all users in a project
   */
  static emitProjectUpdate(projectId: string, project: any): void {
    try {
      if (socketServer) {
        socketServer.emitToProject(projectId, 'projectUpdated', project);
        logger.info(`Project update emitted to project ${projectId}`);
      }
    } catch (error) {
      logger.error('Error emitting project update:', error);
    }
  }

  /**
   * Emit member removal to specific users
   */
  static emitMemberRemoved(projectId: string, removedUserIds: string[]): void {
    try {
      if (socketServer && removedUserIds.length > 0) {
        // Emit to all users in the project about the member removal
        socketServer.emitToProject(projectId, 'memberRemoved', removedUserIds, projectId);
        logger.info(`Member removal emitted to project ${projectId}: ${removedUserIds.join(', ')}`);
      }
    } catch (error) {
      logger.error('Error emitting member removal:', error);
    }
  }

  /**
   * Get server statistics
   */
  static getServerStats(): { connectedProjects: number; totalUsers: number } {
    try {
      if (socketServer) {
        return {
          connectedProjects: socketServer.getConnectedProjectsCount(),
          totalUsers: socketServer.getTotalConnectedUsers(),
        };
      }
      return { connectedProjects: 0, totalUsers: 0 };
    } catch (error) {
      logger.error('Error getting server stats:', error);
      return { connectedProjects: 0, totalUsers: 0 };
    }
  }
}
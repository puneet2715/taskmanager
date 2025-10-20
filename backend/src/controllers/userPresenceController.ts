import { Request, Response } from 'express';
// import mongoose from 'mongoose';
// import { Project } from '../models/Project';
import { UserPresenceService } from '../services/userPresenceService';
import { logger } from '../utils/logger';

// Create a singleton instance of UserPresenceService
export const userPresenceService = new UserPresenceService();

/**
 * Controller for user presence endpoints
 */
export class UserPresenceController {
  /**
   * Get current active users for a project
   */
  static async getProjectPresence(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project ID is required',
          },
        });
        return;
      }

      const presence = userPresenceService.getProjectPresence(projectId);
      
      // Convert Map to array for JSON serialization
      const users = Array.from(presence.users.values()).map(user => ({
        userId: user.userId,
        email: user.email,
        connectionCount: user.connectionCount,
        lastSeen: user.lastSeen,
      }));

      res.json({
        success: true,
        data: {
          projectId: presence.projectId,
          totalActiveUsers: presence.totalActiveUsers,
          users,
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug(`Project presence requested for ${projectId}: ${presence.totalActiveUsers} users`);
    } catch (error) {
      logger.error('Error getting project presence:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get project presence',
        },
      });
    }
  }

  /**
   * Get active user count for a project
   */
  static async getProjectUserCount(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project ID is required',
          },
        });
        return;
      }

      const userCount = userPresenceService.getProjectUserCount(projectId);
      const activeUsers = userPresenceService.getProjectActiveUsers(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          userCount,
          activeUsers,
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug(`User count requested for ${projectId}: ${userCount} users`);
    } catch (error) {
      logger.error('Error getting project user count:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get project user count',
        },
      });
    }
  }

  /**
   * Get overall presence statistics (admin only)
   */
  static async getPresenceStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = userPresenceService.getPresenceStats();

      res.json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug('Presence stats requested');
    } catch (error) {
      logger.error('Error getting presence stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get presence statistics',
        },
      });
    }
  }

  /**
   * Get all project presence data (admin only)
   */
  static async getAllProjectPresence(_req: Request, res: Response): Promise<void> {
    try {
      const allPresence = userPresenceService.getAllProjectPresence();
      
      // Convert Map to object for JSON serialization
      const projects: Record<string, any> = {};
      for (const [projectId, presence] of allPresence) {
        projects[projectId] = {
          projectId: presence.projectId,
          totalActiveUsers: presence.totalActiveUsers,
          users: Array.from(presence.users.values()).map(user => ({
            userId: user.userId,
            email: user.email,
            connectionCount: user.connectionCount,
            lastSeen: user.lastSeen,
          })),
        };
      }

      res.json({
        success: true,
        data: {
          projects,
          totalProjects: allPresence.size,
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug('All project presence requested');
    } catch (error) {
      logger.error('Error getting all project presence:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get all project presence',
        },
      });
    }
  }

  /**
   * Force cleanup of stale connections (admin only)
   */
  static async cleanupStaleConnections(_req: Request, res: Response): Promise<void> {
    try {
      const result = userPresenceService.cleanupStaleConnections();

      res.json({
        success: true,
        data: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(`Manual cleanup completed: removed ${result.removedUsers} users and ${result.removedProjects} projects`);
    } catch (error) {
      logger.error('Error during manual cleanup:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cleanup stale connections',
        },
      });
    }
  }

  /**
   * Get debug information about presence state (admin only)
   */
  static async getDebugInfo(_req: Request, res: Response): Promise<void> {
    try {
      const debugInfo = userPresenceService.getDebugInfo();

      res.json({
        success: true,
        data: {
          ...debugInfo,
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug('Debug info requested');
    } catch (error) {
      logger.error('Error getting debug info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get debug information',
        },
      });
    }
  }
}
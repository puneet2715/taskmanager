import { logger } from '../utils/logger';

export interface UserPresenceState {
  userId: string;
  email: string;
  projectId: string;
  connectionCount: number;
  lastSeen: Date;
}

export interface ProjectPresence {
  projectId: string;
  users: Map<string, UserPresenceState>;
  totalActiveUsers: number;
}

export interface UserPresenceStats {
  totalProjects: number;
  totalActiveUsers: number;
  totalConnections: number;
  staleConnections: number;
}

/**
 * Service for managing user presence state across projects
 * Provides accurate user counts, cleanup mechanisms, and state validation
 */
export class UserPresenceService {
  // Per-project user tracking with connection counting
  private projectUsers: Map<string, Map<string, UserPresenceState>> = new Map();
  
  // Socket ID to user/project mapping for cleanup
  private socketMappings: Map<string, {
    userId: string;
    projectId: string;
    email: string;
    timestamp: Date;
  }> = new Map();

  // Configuration
  private readonly STALE_CONNECTION_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startPeriodicCleanup();
  }

  /**
   * Add a user connection to a project
   */
  public addUserConnection(
    socketId: string,
    userId: string,
    email: string,
    projectId: string
  ): { isFirstConnection: boolean; connectionCount: number } {
    try {
      // Add socket mapping for cleanup
      this.socketMappings.set(socketId, {
        userId,
        projectId,
        email,
        timestamp: new Date(),
      });

      // Get or create project user map
      if (!this.projectUsers.has(projectId)) {
        this.projectUsers.set(projectId, new Map());
      }
      
      const projectUserMap = this.projectUsers.get(projectId)!;
      const existingState = projectUserMap.get(userId);

      if (existingState) {
        // User already in project, increment connection count
        existingState.connectionCount++;
        existingState.lastSeen = new Date();
        
        logger.debug(`User ${email} added connection to project ${projectId} (total: ${existingState.connectionCount})`);
        
        return {
          isFirstConnection: false,
          connectionCount: existingState.connectionCount,
        };
      } else {
        // First connection for this user in this project
        const newState: UserPresenceState = {
          userId,
          email,
          projectId,
          connectionCount: 1,
          lastSeen: new Date(),
        };
        
        projectUserMap.set(userId, newState);
        
        logger.info(`User ${email} joined project ${projectId} (first connection)`);
        
        return {
          isFirstConnection: true,
          connectionCount: 1,
        };
      }
    } catch (error) {
      logger.error('Error adding user connection:', error);
      throw error;
    }
  }

  /**
   * Remove a user connection from a project
   */
  public removeUserConnection(
    socketId: string
  ): { userId?: string; projectId?: string; isLastConnection: boolean; connectionCount: number } {
    try {
      const socketMapping = this.socketMappings.get(socketId);
      
      if (!socketMapping) {
        logger.warn(`No socket mapping found for socket ${socketId}`);
        return { isLastConnection: false, connectionCount: 0 };
      }

      const { userId, projectId, email } = socketMapping;
      
      // Remove socket mapping
      this.socketMappings.delete(socketId);

      // Get project user map
      const projectUserMap = this.projectUsers.get(projectId);
      if (!projectUserMap) {
        logger.warn(`No project user map found for project ${projectId}`);
        return { userId, projectId, isLastConnection: false, connectionCount: 0 };
      }

      const userState = projectUserMap.get(userId);
      if (!userState) {
        logger.warn(`User ${userId} not found in project ${projectId}`);
        return { userId, projectId, isLastConnection: false, connectionCount: 0 };
      }

      // Decrement connection count
      userState.connectionCount--;
      userState.lastSeen = new Date();

      const isLastConnection = userState.connectionCount <= 0;

      if (isLastConnection) {
        // Remove user completely from project
        projectUserMap.delete(userId);
        
        // Clean up empty project map
        if (projectUserMap.size === 0) {
          this.projectUsers.delete(projectId);
        }
        
        logger.info(`User ${email} left project ${projectId} (last connection)`);
        
        return { userId, projectId, isLastConnection: true, connectionCount: 0 };
      } else {
        logger.debug(`User ${email} removed connection from project ${projectId} (remaining: ${userState.connectionCount})`);
        
        return { userId, projectId, isLastConnection: false, connectionCount: userState.connectionCount };
      }
    } catch (error) {
      logger.error('Error removing user connection:', error);
      throw error;
    }
  }

  /**
   * Get accurate user count for a project
   */
  public getProjectUserCount(projectId: string): number {
    const projectUserMap = this.projectUsers.get(projectId);
    return projectUserMap ? projectUserMap.size : 0;
  }

  /**
   * Get list of active user IDs for a project
   */
  public getProjectActiveUsers(projectId: string): string[] {
    const projectUserMap = this.projectUsers.get(projectId);
    return projectUserMap ? Array.from(projectUserMap.keys()) : [];
  }

  /**
   * Get detailed user presence information for a project
   */
  public getProjectPresence(projectId: string): ProjectPresence {
    const projectUserMap = this.projectUsers.get(projectId);
    
    if (!projectUserMap) {
      return {
        projectId,
        users: new Map(),
        totalActiveUsers: 0,
      };
    }

    return {
      projectId,
      users: new Map(projectUserMap),
      totalActiveUsers: projectUserMap.size,
    };
  }

  /**
   * Get user presence state for a specific user in a project
   */
  public getUserPresenceState(projectId: string, userId: string): UserPresenceState | null {
    const projectUserMap = this.projectUsers.get(projectId);
    return projectUserMap?.get(userId) || null;
  }

  /**
   * Get all active projects with user counts
   */
  public getAllProjectPresence(): Map<string, ProjectPresence> {
    const result = new Map<string, ProjectPresence>();
    
    for (const [projectId, userMap] of this.projectUsers) {
      result.set(projectId, {
        projectId,
        users: new Map(userMap),
        totalActiveUsers: userMap.size,
      });
    }
    
    return result;
  }

  /**
   * Get overall presence statistics
   */
  public getPresenceStats(): UserPresenceStats {
    const now = new Date();
    let totalConnections = 0;
    let staleConnections = 0;

    // Count total connections and identify stale ones
    for (const userMap of this.projectUsers.values()) {
      for (const userState of userMap.values()) {
        totalConnections += userState.connectionCount;
        
        if (now.getTime() - userState.lastSeen.getTime() > this.STALE_CONNECTION_THRESHOLD) {
          staleConnections += userState.connectionCount;
        }
      }
    }

    return {
      totalProjects: this.projectUsers.size,
      totalActiveUsers: Array.from(this.projectUsers.values()).reduce((total, userMap) => total + userMap.size, 0),
      totalConnections,
      staleConnections,
    };
  }

  /**
   * Clean up stale connections and orphaned records
   */
  public cleanupStaleConnections(): { removedUsers: number; removedProjects: number } {
    const now = new Date();
    let removedUsers = 0;
    let removedProjects = 0;

    try {
      // Clean up stale user presence records
      for (const [projectId, userMap] of this.projectUsers) {
        const usersToRemove: string[] = [];
        
        for (const [userId, userState] of userMap) {
          if (now.getTime() - userState.lastSeen.getTime() > this.STALE_CONNECTION_THRESHOLD) {
            usersToRemove.push(userId);
            removedUsers++;
            logger.debug(`Removing stale user ${userState.email} from project ${projectId}`);
          }
        }
        
        // Remove stale users
        for (const userId of usersToRemove) {
          userMap.delete(userId);
        }
        
        // Remove empty projects
        if (userMap.size === 0) {
          this.projectUsers.delete(projectId);
          removedProjects++;
          logger.debug(`Removed empty project ${projectId}`);
        }
      }

      // Clean up orphaned socket mappings
      const socketsToRemove: string[] = [];
      for (const [socketId, mapping] of this.socketMappings) {
        if (now.getTime() - mapping.timestamp.getTime() > this.STALE_CONNECTION_THRESHOLD) {
          socketsToRemove.push(socketId);
        }
      }
      
      for (const socketId of socketsToRemove) {
        this.socketMappings.delete(socketId);
      }

      if (removedUsers > 0 || removedProjects > 0) {
        logger.info(`Cleanup completed: removed ${removedUsers} stale users and ${removedProjects} empty projects`);
      }

      return { removedUsers, removedProjects };
    } catch (error) {
      logger.error('Error during cleanup:', error);
      return { removedUsers: 0, removedProjects: 0 };
    }
  }

  /**
   * Validate and repair inconsistent state
   */
  public validateAndRepairState(): { repairedUsers: number; repairedProjects: number } {
    let repairedUsers = 0;
    let repairedProjects = 0;

    try {
      // Validate connection counts are positive
      for (const [projectId, userMap] of this.projectUsers) {
        for (const [userId, userState] of userMap) {
          if (userState.connectionCount <= 0) {
            userMap.delete(userId);
            repairedUsers++;
            logger.warn(`Repaired: removed user ${userState.email} with invalid connection count from project ${projectId}`);
          }
        }
        
        // Clean up empty projects
        if (userMap.size === 0) {
          this.projectUsers.delete(projectId);
          repairedProjects++;
        }
      }

      if (repairedUsers > 0 || repairedProjects > 0) {
        logger.info(`State validation completed: repaired ${repairedUsers} users and ${repairedProjects} projects`);
      }

      return { repairedUsers, repairedProjects };
    } catch (error) {
      logger.error('Error during state validation:', error);
      return { repairedUsers: 0, repairedProjects: 0 };
    }
  }

  /**
   * Force remove a user from a project (for admin/cleanup purposes)
   */
  public forceRemoveUser(projectId: string, userId: string): boolean {
    try {
      const projectUserMap = this.projectUsers.get(projectId);
      if (!projectUserMap) {
        return false;
      }

      const removed = projectUserMap.delete(userId);
      
      if (removed) {
        // Clean up empty project
        if (projectUserMap.size === 0) {
          this.projectUsers.delete(projectId);
        }
        
        // Clean up related socket mappings
        const socketsToRemove: string[] = [];
        for (const [socketId, mapping] of this.socketMappings) {
          if (mapping.userId === userId && mapping.projectId === projectId) {
            socketsToRemove.push(socketId);
          }
        }
        
        for (const socketId of socketsToRemove) {
          this.socketMappings.delete(socketId);
        }
        
        logger.info(`Force removed user ${userId} from project ${projectId}`);
      }

      return removed;
    } catch (error) {
      logger.error('Error force removing user:', error);
      return false;
    }
  }

  /**
   * Start periodic cleanup of stale connections
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
      this.validateAndRepairState();
    }, this.CLEANUP_INTERVAL);
    
    logger.info('Started periodic cleanup for user presence service');
  }

  /**
   * Stop periodic cleanup (for testing or shutdown)
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      // this.cleanupTimer = undefined;
      logger.info('Stopped periodic cleanup for user presence service');
    }
  }

  /**
   * Get debug information about current state
   */
  public getDebugInfo(): {
    projectCount: number;
    totalUsers: number;
    socketMappings: number;
    projects: Array<{ projectId: string; userCount: number; users: string[] }>;
  } {
    const projects: Array<{ projectId: string; userCount: number; users: string[] }> = [];
    
    for (const [projectId, userMap] of this.projectUsers) {
      projects.push({
        projectId,
        userCount: userMap.size,
        users: Array.from(userMap.keys()),
      });
    }

    return {
      projectCount: this.projectUsers.size,
      totalUsers: Array.from(this.projectUsers.values()).reduce((total, userMap) => total + userMap.size, 0),
      socketMappings: this.socketMappings.size,
      projects,
    };
  }
}
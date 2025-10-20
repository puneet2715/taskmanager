import { UserPresenceService, UserPresenceState } from '../../services/userPresenceService';

describe('UserPresenceService', () => {
  let service: UserPresenceService;

  beforeEach(() => {
    service = new UserPresenceService();
    // Stop periodic cleanup for tests
    service.stopPeriodicCleanup();
  });

  afterEach(() => {
    service.stopPeriodicCleanup();
  });

  describe('addUserConnection', () => {
    it('should add first user connection to project', () => {
      const result = service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      expect(result.isFirstConnection).toBe(true);
      expect(result.connectionCount).toBe(1);
      expect(service.getProjectUserCount('project1')).toBe(1);
      expect(service.getProjectActiveUsers('project1')).toEqual(['user1']);
    });

    it('should increment connection count for existing user', () => {
      // Add first connection
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      // Add second connection for same user
      const result = service.addUserConnection('socket2', 'user1', 'user1@test.com', 'project1');
      
      expect(result.isFirstConnection).toBe(false);
      expect(result.connectionCount).toBe(2);
      expect(service.getProjectUserCount('project1')).toBe(1); // Still only 1 unique user
    });

    it('should handle multiple users in same project', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user2', 'user2@test.com', 'project1');
      
      expect(service.getProjectUserCount('project1')).toBe(2);
      expect(service.getProjectActiveUsers('project1')).toEqual(['user1', 'user2']);
    });

    it('should handle same user in multiple projects', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user1', 'user1@test.com', 'project2');
      
      expect(service.getProjectUserCount('project1')).toBe(1);
      expect(service.getProjectUserCount('project2')).toBe(1);
    });
  });

  describe('removeUserConnection', () => {
    it('should remove user when last connection is removed', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      const result = service.removeUserConnection('socket1');
      
      expect(result.isLastConnection).toBe(true);
      expect(result.userId).toBe('user1');
      expect(result.projectId).toBe('project1');
      expect(service.getProjectUserCount('project1')).toBe(0);
    });

    it('should decrement connection count when user has multiple connections', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user1', 'user1@test.com', 'project1');
      
      const result = service.removeUserConnection('socket1');
      
      expect(result.isLastConnection).toBe(false);
      expect(result.connectionCount).toBe(1);
      expect(service.getProjectUserCount('project1')).toBe(1); // User still present
    });

    it('should handle removal of non-existent socket', () => {
      const result = service.removeUserConnection('nonexistent');
      
      expect(result.isLastConnection).toBe(false);
      expect(result.connectionCount).toBe(0);
      expect(result.userId).toBeUndefined();
    });

    it('should clean up empty projects', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.removeUserConnection('socket1');
      
      const presence = service.getProjectPresence('project1');
      expect(presence.totalActiveUsers).toBe(0);
      expect(presence.users.size).toBe(0);
    });
  });

  describe('getProjectUserCount', () => {
    it('should return 0 for non-existent project', () => {
      expect(service.getProjectUserCount('nonexistent')).toBe(0);
    });

    it('should return correct count for project with users', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user2', 'user2@test.com', 'project1');
      
      expect(service.getProjectUserCount('project1')).toBe(2);
    });
  });

  describe('getProjectPresence', () => {
    it('should return empty presence for non-existent project', () => {
      const presence = service.getProjectPresence('nonexistent');
      
      expect(presence.projectId).toBe('nonexistent');
      expect(presence.totalActiveUsers).toBe(0);
      expect(presence.users.size).toBe(0);
    });

    it('should return correct presence data', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user2', 'user2@test.com', 'project1');
      
      const presence = service.getProjectPresence('project1');
      
      expect(presence.projectId).toBe('project1');
      expect(presence.totalActiveUsers).toBe(2);
      expect(presence.users.size).toBe(2);
      expect(presence.users.has('user1')).toBe(true);
      expect(presence.users.has('user2')).toBe(true);
    });
  });

  describe('getUserPresenceState', () => {
    it('should return null for non-existent user', () => {
      const state = service.getUserPresenceState('project1', 'user1');
      expect(state).toBeNull();
    });

    it('should return correct user state', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      const state = service.getUserPresenceState('project1', 'user1');
      
      expect(state).not.toBeNull();
      expect(state!.userId).toBe('user1');
      expect(state!.email).toBe('user1@test.com');
      expect(state!.projectId).toBe('project1');
      expect(state!.connectionCount).toBe(1);
    });
  });

  describe('getPresenceStats', () => {
    it('should return correct stats', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user1', 'user1@test.com', 'project1'); // Same user, multiple connections
      service.addUserConnection('socket3', 'user2', 'user2@test.com', 'project2');
      
      const stats = service.getPresenceStats();
      
      expect(stats.totalProjects).toBe(2);
      expect(stats.totalActiveUsers).toBe(2);
      expect(stats.totalConnections).toBe(3);
      expect(stats.staleConnections).toBe(0); // All connections are fresh
    });
  });

  describe('cleanupStaleConnections', () => {
    it('should remove stale connections', async () => {
      // Add a user connection
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      // Manually set lastSeen to old date to simulate stale connection
      const state = service.getUserPresenceState('project1', 'user1');
      if (state) {
        state.lastSeen = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      }
      
      const result = service.cleanupStaleConnections();
      
      expect(result.removedUsers).toBe(1);
      expect(result.removedProjects).toBe(1);
      expect(service.getProjectUserCount('project1')).toBe(0);
    });

    it('should not remove fresh connections', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      const result = service.cleanupStaleConnections();
      
      expect(result.removedUsers).toBe(0);
      expect(result.removedProjects).toBe(0);
      expect(service.getProjectUserCount('project1')).toBe(1);
    });
  });

  describe('validateAndRepairState', () => {
    it('should repair invalid connection counts', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      // Manually corrupt the state
      const state = service.getUserPresenceState('project1', 'user1');
      if (state) {
        state.connectionCount = -1; // Invalid count
      }
      
      const result = service.validateAndRepairState();
      
      expect(result.repairedUsers).toBe(1);
      expect(result.repairedProjects).toBe(1);
      expect(service.getProjectUserCount('project1')).toBe(0);
    });
  });

  describe('forceRemoveUser', () => {
    it('should force remove user from project', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      
      const removed = service.forceRemoveUser('project1', 'user1');
      
      expect(removed).toBe(true);
      expect(service.getProjectUserCount('project1')).toBe(0);
    });

    it('should return false for non-existent user', () => {
      const removed = service.forceRemoveUser('project1', 'nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should return correct debug information', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user2', 'user2@test.com', 'project1');
      service.addUserConnection('socket3', 'user3', 'user3@test.com', 'project2');
      
      const debug = service.getDebugInfo();
      
      expect(debug.projectCount).toBe(2);
      expect(debug.totalUsers).toBe(3);
      expect(debug.socketMappings).toBe(3);
      expect(debug.projects).toHaveLength(2);
      
      const project1 = debug.projects.find(p => p.projectId === 'project1');
      expect(project1?.userCount).toBe(2);
      expect(project1?.users).toEqual(['user1', 'user2']);
    });
  });

  describe('getAllProjectPresence', () => {
    it('should return all project presence data', () => {
      service.addUserConnection('socket1', 'user1', 'user1@test.com', 'project1');
      service.addUserConnection('socket2', 'user2', 'user2@test.com', 'project2');
      
      const allPresence = service.getAllProjectPresence();
      
      expect(allPresence.size).toBe(2);
      expect(allPresence.has('project1')).toBe(true);
      expect(allPresence.has('project2')).toBe(true);
      
      const project1Presence = allPresence.get('project1');
      expect(project1Presence?.totalActiveUsers).toBe(1);
      expect(project1Presence?.users.has('user1')).toBe(true);
    });
  });
});
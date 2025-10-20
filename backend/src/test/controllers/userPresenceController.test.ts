import request from 'supertest';
import app from '../../index';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { AuthService } from '../../services/authService';
import { userPresenceService } from '../../controllers/userPresenceController';

describe('UserPresenceController', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let testProject: any;
  let testProject2: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user
    const testUser = new User({
      email: 'testuser@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'user',
    });
    await testUser.save();
    userId = testUser._id.toString();
    userToken = AuthService.generateToken({ userId, email: testUser.email, role: testUser.role });

    // Create admin user
    const adminUser = new User({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
    });
    await adminUser.save();
    adminId = adminUser._id.toString();
    adminToken = AuthService.generateToken({ userId: adminId, email: adminUser.email, role: adminUser.role });

    // Create test projects
    testProject = new Project({
      name: 'Test Project 1',
      description: 'Test project for presence testing',
      owner: testUser._id,
      members: [testUser._id, adminUser._id]
    });
    await testProject.save();

    testProject2 = new Project({
      name: 'Test Project 2',
      description: 'Second test project',
      owner: adminUser._id,
      members: [adminUser._id, testUser._id]
    });
    await testProject2.save();

    // Stop periodic cleanup for tests
    userPresenceService.stopPeriodicCleanup();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await disconnectDatabase();
  });

  beforeEach(() => {
    // Clear presence state before each test by force removing all users
    const debugInfo = userPresenceService.getDebugInfo();
    for (const project of debugInfo.projects) {
      for (const userId of project.users) {
        userPresenceService.forceRemoveUser(project.projectId, userId);
      }
    }
    
    // Additional cleanup
    userPresenceService.cleanupStaleConnections();
    userPresenceService.validateAndRepairState();
  });

  describe('GET /api/presence/projects/:projectId', () => {
    it('should return project presence data', async () => {
      const projectId = testProject._id.toString();
      
      // Add some test users to the project
      userPresenceService.addUserConnection('socket1', userId, 'testuser@example.com', projectId);
      userPresenceService.addUserConnection('socket2', adminId, 'admin@example.com', projectId);

      const response = await request(app)
        .get(`/api/presence/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe(projectId);
      expect(response.body.data.totalActiveUsers).toBe(2);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/presence/projects/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/presence/projects/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid project ID format');
    });

    it('should return 403 for projects list endpoint (admin only)', async () => {
      await request(app)
        .get('/api/presence/projects/')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403); // This hits the admin-only route for all projects
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/presence/projects/${testProject._id}`)
        .expect(401);
    });

    it('should return 403 for non-member user', async () => {
      // Create a project that the user is not a member of
      const nonMemberProject = new Project({
        name: 'Non-member Project',
        description: 'Project user is not a member of',
        owner: adminId,
        members: [adminId] // Only admin is a member
      });
      await nonMemberProject.save();

      const response = await request(app)
        .get(`/api/presence/projects/${nonMemberProject._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Cleanup
      await Project.findByIdAndDelete(nonMemberProject._id);
    });
  });

  describe('GET /api/presence/projects/:projectId/count', () => {
    it('should return project user count', async () => {
      const projectId = testProject._id.toString();
      
      // Add test users
      userPresenceService.addUserConnection('socket1', userId, 'testuser@example.com', projectId);
      userPresenceService.addUserConnection('socket2', adminId, 'admin@example.com', projectId);

      const response = await request(app)
        .get(`/api/presence/projects/${projectId}/count`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe(projectId);
      expect(response.body.data.userCount).toBe(2);
      expect(response.body.data.activeUsers).toEqual([userId, adminId]);
    });

    it('should return 0 for project with no active users', async () => {
      const projectId = testProject2._id.toString();
      
      const response = await request(app)
        .get(`/api/presence/projects/${projectId}/count`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userCount).toBe(0);
      expect(response.body.data.activeUsers).toEqual([]);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/presence/projects/507f1f77bcf86cd799439011/count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/presence/projects/invalid-id/count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/presence/stats', () => {
    it('should return presence statistics for admin', async () => {
      // Add some test data
      userPresenceService.addUserConnection('socket1', userId, 'testuser@example.com', testProject._id.toString());
      userPresenceService.addUserConnection('socket2', adminId, 'admin@example.com', testProject2._id.toString());

      const response = await request(app)
        .get('/api/presence/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProjects).toBe(2);
      expect(response.body.data.totalActiveUsers).toBe(2);
      expect(response.body.data.totalConnections).toBe(2);
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .get('/api/presence/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/presence/stats')
        .expect(401);
    });
  });

  describe('GET /api/presence/projects', () => {
    it('should return all project presence data for admin', async () => {
      // Add test data
      userPresenceService.addUserConnection('socket1', userId, 'testuser@example.com', testProject._id.toString());
      userPresenceService.addUserConnection('socket2', adminId, 'admin@example.com', testProject2._id.toString());

      const response = await request(app)
        .get('/api/presence/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProjects).toBe(2);
      expect(response.body.data.projects).toBeDefined();
      expect(Object.keys(response.body.data.projects)).toHaveLength(2);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .get('/api/presence/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/presence/cleanup', () => {
    it('should perform cleanup for admin', async () => {
      const response = await request(app)
        .post('/api/presence/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.removedUsers).toBeDefined();
      expect(response.body.data.removedProjects).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .post('/api/presence/cleanup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/presence/debug', () => {
    it('should return debug information for admin', async () => {
      // Add test data
      userPresenceService.addUserConnection('socket1', userId, 'testuser@example.com', 'project1');

      const response = await request(app)
        .get('/api/presence/debug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectCount).toBeDefined();
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.socketMappings).toBeDefined();
      expect(response.body.data.projects).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      await request(app)
        .get('/api/presence/debug')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
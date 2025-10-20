import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { projectRoutes } from '../../routes/projectRoutes';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { Task } from '../../models/Task';
import { AuthService } from '../../services/authService';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api/projects', projectRoutes);
  
  return app;
};

describe('Project Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let testUser: any;
  let testUser2: any;
  let authToken: string;
  let authToken2: string;
  let testProject: any;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri);
    
    // Create test app
    app = createTestApp();
    // Create test users
    testUser = new User({
      email: 'testuser@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'user'
    });
    await testUser.save();

    testUser2 = new User({
      email: 'testuser2@example.com',
      password: 'password123',
      name: 'Test User 2',
      role: 'user'
    });
    await testUser2.save();

    // Generate auth tokens
    authToken = AuthService.generateToken({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role
    });

    authToken2 = AuthService.generateToken({
      userId: testUser2._id.toString(),
      email: testUser2.email,
      role: testUser2.role
    });
  });

  beforeEach(async () => {
    // Clean up projects and tasks before each test
    await Project.deleteMany({});
    await Task.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    
    // Close database connection and stop MongoDB instance
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('GET /api/projects', () => {
    it('should return empty array when user has no projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return user projects', async () => {
      // Create test projects
      const project1 = new Project({
        name: 'Project 1',
        description: 'Test project 1',
        owner: testUser._id,
        members: [testUser._id]
      });
      await project1.save();

      const project2 = new Project({
        name: 'Project 2',
        owner: testUser._id,
        members: [testUser._id]
      });
      await project2.save();

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.data[0].name).toBeDefined();
      expect(response.body.data[0].owner).toBeDefined();
      expect(response.body.data[0].members).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new test project'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.owner._id).toBe(testUser._id.toString());
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0]._id).toBe(testUser._id.toString());
    });

    it('should create project without description', async () => {
      const projectData = {
        name: 'Project Without Description'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBeNull();
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = new Project({
        name: 'Test Project',
        description: 'Test description',
        owner: testUser._id,
        members: [testUser._id]
      });
      await testProject.save();
    });

    it('should return project details for member', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testProject._id.toString());
      expect(response.body.data.name).toBe(testProject.name);
      expect(response.body.data.owner).toBeDefined();
      expect(response.body.data.members).toBeDefined();
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('PUT /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = new Project({
        name: 'Test Project',
        description: 'Test description',
        owner: testUser._id,
        members: [testUser._id]
      });
      await testProject.save();
    });

    it('should update project name and description', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should update only name', async () => {
      const updateData = {
        name: 'Updated Name Only'
      };

      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(testProject.description);
    });

    it('should return 403 for non-owner', async () => {
      // Add testUser2 as member but not owner
      testProject.members.push(testUser2._id);
      await testProject.save();

      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = new Project({
        name: 'Test Project',
        description: 'Test description',
        owner: testUser._id,
        members: [testUser._id]
      });
      await testProject.save();
    });

    it('should delete project and associated tasks', async () => {
      // Create some tasks for the project
      const task1 = new Task({
        title: 'Task 1',
        project: testProject._id,
        createdBy: testUser._id,
        position: 0
      });
      const task2 = new Task({
        title: 'Task 2',
        project: testProject._id,
        createdBy: testUser._id,
        position: 1
      });
      await task1.save();
      await task2.save();

      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify project is deleted
      const deletedProject = await Project.findById(testProject._id);
      expect(deletedProject).toBeNull();

      // Verify tasks are deleted
      const remainingTasks = await Task.find({ project: testProject._id });
      expect(remainingTasks).toHaveLength(0);
    });

    it('should return 403 for non-owner', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Verify project still exists
      const existingProject = await Project.findById(testProject._id);
      expect(existingProject).not.toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .delete('/api/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });
});
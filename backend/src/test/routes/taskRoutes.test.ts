import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { taskRoutes } from '../../routes/taskRoutes';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { Task } from '../../models/Task';
import { ActivityLog } from '../../models/ActivityLog';
import { AuthService } from '../../services/authService';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api', taskRoutes);
  
  return app;
};

describe('Task Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let testUser: any;
  let testUser2: any;
  let authToken: string;
  let authToken2: string;
  let testProject: any;
  let testTask: any;

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

    // Create test project
    testProject = new Project({
      name: 'Test Project',
      description: 'Test description',
      owner: testUser._id,
      members: [testUser._id]
    });
    await testProject.save();
  });

  beforeEach(async () => {
    // Clean up tasks and activity logs before each test
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    
    // Close database connection and stop MongoDB instance
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('GET /api/projects/:id/tasks', () => {
    it('should return empty array when project has no tasks', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return project tasks sorted by status and position', async () => {
      // Create test tasks
      const task1 = new Task({
        title: 'Task 1',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'todo',
        position: 0
      });
      const task2 = new Task({
        title: 'Task 2',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'inprogress',
        position: 0
      });
      await task1.save();
      await task2.save();

      const response = await request(app)
        .get(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.data[0].title).toBeDefined();
      expect(response.body.data[0].createdBy).toBeDefined();
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/projects/${nonExistentId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}/tasks`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/projects/:id/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData);

      

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.position).toBe(0);
      expect(response.body.data.createdBy._id).toBe(testUser._id.toString());

      // Check activity log was created
      const activityLog = await ActivityLog.findOne({ entityId: response.body.data._id });
      expect(activityLog).not.toBeNull();
      expect(activityLog!.action).toBe('created');
    });

    it('should create task with assignee', async () => {
      // Add testUser2 as project member
      testProject.members.push(testUser2._id);
      await testProject.save();

      const taskData = {
        title: 'Assigned Task',
        assignee: testUser2._id.toString()
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignee._id).toBe(testUser2._id.toString());
    });

    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid assignee', async () => {
      const taskData = {
        title: 'Task with invalid assignee',
        assignee: testUser2._id.toString() // testUser2 is not a project member
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ASSIGNEE');
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProject._id}/tasks`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ title: 'Unauthorized Task' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    beforeEach(async () => {
      testTask = new Task({
        title: 'Test Task',
        description: 'Test description',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'todo',
        position: 0
      });
      await testTask.save();
    });

    it('should update task title and description', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);

      // Check activity log was created
      const activityLog = await ActivityLog.findOne({ entityId: testTask._id, action: 'updated' });
      expect(activityLog).not.toBeNull();
    });

    it('should update task status', async () => {
      const updateData = {
        status: 'inprogress'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    beforeEach(async () => {
      testTask = new Task({
        title: 'Test Task',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'todo',
        position: 0
      });
      await testTask.save();
    });

    it('should delete task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify task is deleted
      const deletedTask = await Task.findById(testTask._id);
      expect(deletedTask).toBeNull();

      // Check activity log was created
      const activityLog = await ActivityLog.findOne({ entityId: testTask._id, action: 'deleted' });
      expect(activityLog).not.toBeNull();
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Verify task still exists
      const existingTask = await Task.findById(testTask._id);
      expect(existingTask).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('PUT /api/tasks/:id/move', () => {
    beforeEach(async () => {
      testTask = new Task({
        title: 'Test Task',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'todo',
        position: 0
      });
      await testTask.save();
    });

    it('should move task to different status', async () => {
      const moveData = {
        status: 'inprogress',
        position: 0
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(moveData.status);
      expect(response.body.data.position).toBe(moveData.position);

      // Check activity log was created
      const activityLog = await ActivityLog.findOne({ entityId: testTask._id, action: 'moved' });
      expect(activityLog).not.toBeNull();
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ position: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for non-member', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}/move`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ status: 'inprogress' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
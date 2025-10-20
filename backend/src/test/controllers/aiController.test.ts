import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { Task } from '../../models/Task';
import { AISummary } from '../../models/AISummary';
import { AIQuestion } from '../../models/AIQuestion';
import { AuthService } from '../../services/authService';

describe('AI Controller', () => {
  let testUser: any;
  let testProject: any;
  let testTask: any;
  let userToken: string;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'hashedpassword123',
      role: 'user'
    });
    await testUser.save();

    // Generate token
    userToken = AuthService.generateToken({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role
    });

    // Create test project
    testProject = new Project({
      name: 'Test Project',
      description: 'A test project for AI functionality',
      owner: testUser._id,
      members: [testUser._id]
    });
    await testProject.save();

    // Create test task
    testTask = new Task({
      title: 'Test Task',
      description: 'A test task for AI questions',
      project: testProject._id,
      createdBy: testUser._id,
      status: 'todo',
      priority: 'medium',
      position: 0
    });
    await testTask.save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await AISummary.deleteMany({});
    await AIQuestion.deleteMany({});
    await disconnectDatabase();
  });

  describe('GET /api/ai/status', () => {
    it('should return AI service status', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configured');
      expect(response.body.data).toHaveProperty('connected');
      expect(response.body.data).toHaveProperty('quota');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/projects/:id/summary', () => {
    it('should return validation error for invalid project ID', async () => {
      const response = await request(app)
        .post('/api/ai/projects/invalid-id/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/ai/projects/${nonExistentId}/summary`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/ai/projects/${testProject._id}/summary`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ai/projects/:id/summary/latest', () => {
    it('should return null when no summary exists', async () => {
      const response = await request(app)
        .get(`/api/ai/projects/${testProject._id}/summary/latest`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return validation error for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/ai/projects/invalid-id/summary/latest')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai/tasks/:id/question', () => {
    it('should return validation error for missing question', async () => {
      const response = await request(app)
        .post(`/api/ai/tasks/${testTask._id}/question`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for empty question', async () => {
      const response = await request(app)
        .post(`/api/ai/tasks/${testTask._id}/question`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ question: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for question too long', async () => {
      const longQuestion = 'a'.repeat(1001);
      const response = await request(app)
        .post(`/api/ai/tasks/${testTask._id}/question`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ question: longQuestion })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid task ID', async () => {
      const response = await request(app)
        .post('/api/ai/tasks/invalid-id/question')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ question: 'What is this task about?' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/ai/tasks/${nonExistentId}/question`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ question: 'What is this task about?' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/ai/tasks/:id/questions/history', () => {
    it('should return empty history for task with no questions', async () => {
      const response = await request(app)
        .get(`/api/ai/tasks/${testTask._id}/questions/history`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return validation error for invalid limit', async () => {
      const response = await request(app)
        .get(`/api/ai/tasks/${testTask._id}/questions/history?limit=100`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for negative offset', async () => {
      const response = await request(app)
        .get(`/api/ai/tasks/${testTask._id}/questions/history?offset=-1`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to AI endpoints', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(15).fill(null).map(() =>
        request(app)
          .get('/api/ai/status')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
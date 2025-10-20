import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { authRoutes } from '../../routes/authRoutes'
import { User } from '../../models/User'

// Create test app
const createTestApp = () => {
  const app = express()
  
  app.use(helmet())
  app.use(cors())
  app.use(morgan('combined'))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  
  app.use('/api/auth', authRoutes)
  
  return app
}

describe('Auth Routes', () => {
  let mongoServer: MongoMemoryServer
  let app: express.Application

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
    app = createTestApp()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    await User.deleteMany({})
  })

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.user.name).toBe(userData.name)
      expect(response.body.data.token).toBeDefined()
    })

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      // Create first user
      await request(app).post('/api/auth/signup').send(userData)

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('already exists')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.data.token).toBeDefined()
    })

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid')
    })
  })

  describe('POST /api/auth/oauth', () => {
    it('should create new OAuth user', async () => {
      const oauthData = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        provider: 'github',
        providerId: '12345',
      }

      const response = await request(app)
        .post('/api/auth/oauth')
        .send(oauthData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(oauthData.email)
      expect(response.body.data.user.name).toBe(oauthData.name)
      expect(response.body.data.token).toBeDefined()
    })

    it('should return existing OAuth user', async () => {
      const oauthData = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        provider: 'github',
        providerId: '12345',
      }

      // Create user first time
      await request(app).post('/api/auth/oauth').send(oauthData)

      // Login again with same OAuth data
      const response = await request(app)
        .post('/api/auth/oauth')
        .send(oauthData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(oauthData.email)
      expect(response.body.data.token).toBeDefined()
    })
  })
})
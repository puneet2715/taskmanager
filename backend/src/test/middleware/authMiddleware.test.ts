import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { authRoutes } from '../../routes/authRoutes'
// import { User } from '../../models/User' // Not needed in this test
import { AuthService } from '../../services/authService'

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

describe('Auth Middleware', () => {
  let mongoServer: MongoMemoryServer
  let app: express.Application
  let userToken: string
  let adminToken: string

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
    app = createTestApp()

    // Create test users
    const userData = {
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
    }

    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    }

    const userResult = await AuthService.registerUser(userData)
    const adminResult = await AuthService.registerUser(adminData)

    userToken = userResult.token
    adminToken = adminResult.token
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    // Clean up any additional test data
  })

  describe('Protected Routes', () => {
    it('should allow access to profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('user@example.com')
    })

    it('should deny access to profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Access token required')
    })

    it('should deny access to profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid or expired token')
    })
  })

  describe('Admin-Only Routes', () => {
    it('should allow admin access to users list', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should deny regular user access to users list', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Insufficient permissions')
    })

    it('should deny unauthenticated access to users list', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Access token required')
    })
  })

  describe('Token Validation', () => {
    it('should extract user information from valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('name')
      expect(response.body.data).toHaveProperty('email')
      expect(response.body.data).toHaveProperty('role')
      expect(response.body.data.role).toBe('user')
    })

    it('should extract admin information from admin token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.role).toBe('admin')
    })
  })
})
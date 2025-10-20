import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { logger } from '../utils/logger'

export interface AuthTokenPayload {
  userId: string
  email: string
  role: string
}

export class AuthService {
  private static readonly JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key'
  private static readonly JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '30d'
  private static readonly SALT_ROUNDS = 12

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions)
  }

  static verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as AuthTokenPayload
  }

  static async registerUser(userData: {
    name: string
    email: string
    password: string
    role?: string
  }) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email })
      if (existingUser) {
        throw new Error('User already exists with this email')
      }

      // Create user (password will be hashed by the pre-save middleware)
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password, // Let the model handle hashing
        role: userData.role || 'user',
      })

      await user.save()

      // Generate token
      const token = this.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      })

      logger.info(`User registered successfully: ${user.email}`)

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      }
    } catch (error) {
      logger.error('Registration error:', error)
      throw error
    }
  }

  static async loginUser(email: string, password: string) {
    try {
      // Find user by email with password field included
      const user = await User.findOne({ email }).select('+password')
      if (!user) {
        throw new Error('Invalid credentials')
      }

      // Check password using the model's method
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        throw new Error('Invalid credentials')
      }

      // Generate token
      const token = this.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      })

      logger.info(`User logged in successfully: ${user.email}`)

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      }
    } catch (error) {
      logger.error('Login error:', error)
      throw error
    }
  }

  static async createOrUpdateOAuthUser(oauthData: {
    email: string
    name: string
    provider: string
    providerId: string
  }) {
    try {
      let user = await User.findOne({ email: oauthData.email })

      if (!user) {
        // Create new user for OAuth with a random password (they won't use it)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        user = new User({
          name: oauthData.name,
          email: oauthData.email,
          role: 'user',
          password: randomPassword, // OAuth users get a random password they won't use
        })
        await user.save()
        logger.info(`OAuth user created: ${user.email} via ${oauthData.provider}`)
      } else {
        logger.info(`OAuth user logged in: ${user.email} via ${oauthData.provider}`)
      }

      // Generate token for OAuth user (same as loginUser/registerUser)
      const token = this.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      })

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      }
    } catch (error) {
      logger.error('OAuth user creation/update error:', error)
      throw error
    }
  }

  static async getUserById(userId: string) {
    try {
      const user = await User.findById(userId).select('-password')
      if (!user) {
        throw new Error('User not found')
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      }
    } catch (error) {
      logger.error('Get user by ID error:', error)
      throw error
    }
  }

  static async getAllUsers() {
    try {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 })

      return users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }))
    } catch (error) {
      logger.error('Get all users error:', error)
      throw error
    }
  }
}
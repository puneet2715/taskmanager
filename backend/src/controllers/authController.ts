import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { AuthService } from '../services/authService'
import { tryDecryptPasswordFromBody } from '../utils/crypto'
import { logger } from '../utils/logger'

export class AuthController {
  static validateRegistration = [
    // Attempt to decrypt password if it is sent encrypted
    tryDecryptPasswordFromBody,
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ]

  static validateLogin = [
    // Attempt to decrypt password for login as well
    tryDecryptPasswordFromBody,
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ]

  static validateOAuth = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Name is required'),
    body('provider')
      .isIn(['github', 'google'])
      .withMessage('Invalid OAuth provider'),
    body('providerId')
      .notEmpty()
      .withMessage('Provider ID is required'),
  ]

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { name, email, password } = req.body
      const result = await AuthService.registerUser({ name, email, password })

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      })
    } catch (error) {
      logger.error('Registration controller error:', error)

      if (error instanceof Error && error.message === 'User already exists with this email') {
        res.status(409).json({
          success: false,
          message: error.message,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { email, password } = req.body
      const result = await AuthService.loginUser(email, password)

      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      })
    } catch (error) {
      logger.error('Login controller error:', error)

      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async oauthHandler(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { email, name, provider, providerId } = req.body
      const result = await AuthService.createOrUpdateOAuthUser({
        email,
        name,
        provider,
        providerId,
      })

      res.json({
        success: true,
        message: 'OAuth authentication successful',
        data: result,
      })
    } catch (error) {
      logger.error('OAuth controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        })
        return
      }

      const user = await AuthService.getUserById(userId)

      res.json({
        success: true,
        data: user,
      })
    } catch (error) {
      logger.error('Get profile controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await AuthService.getAllUsers()

      res.json({
        success: true,
        data: users,
      })
    } catch (error) {
      logger.error('Get all users controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }
}
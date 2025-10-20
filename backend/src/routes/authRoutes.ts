import { Router } from 'express'
import { AuthController } from '../controllers/authController'
import { cryptoController } from '../utils/crypto'
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Public authentication routes
router.get('/public-key', cryptoController.getPublicKey)
router.post('/signup', AuthController.validateRegistration, AuthController.register)
router.post('/signin', AuthController.validateLogin, AuthController.login)
router.post('/oauth', AuthController.validateOAuth, AuthController.oauthHandler)

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile)

// Admin-only routes
router.get('/users', authenticateToken, requireAdmin, AuthController.getAllUsers)

export { router as authRoutes }
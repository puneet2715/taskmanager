import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /api/users/profile - Get current user profile
router.get('/profile', UserController.getProfile);

// PUT /api/users/profile - Update current user profile
router.put('/profile', UserController.updateProfile);

// GET /api/users/search - Search users for assignment
router.get('/search', UserController.searchUsers);

// POST /api/users/batch - Get multiple users by IDs
router.post('/batch', UserController.getUsersByIds);

// GET /api/users/:id - Get user by ID (for public profile)
router.get('/:id', UserController.getUserById);

// GET /api/users - Get all users (admin only)
router.get('/', requireAdmin, UserController.getAllUsers);

export { router as userRoutes };
import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// GET /api/projects - Get all projects for authenticated user
router.get('/', ProjectController.getProjects);

// POST /api/projects - Create a new project
router.post('/', ProjectController.createProject);

// GET /api/projects/:id - Get a specific project
router.get('/:id', ProjectController.getProject);

// PUT /api/projects/:id - Update a project
router.put('/:id', ProjectController.updateProject);

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', ProjectController.deleteProject);

export { router as projectRoutes };
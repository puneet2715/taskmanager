import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// GET /api/projects/:id/tasks - Get all tasks for a project
router.get('/projects/:id/tasks', TaskController.getProjectTasks);

// POST /api/projects/:id/tasks - Create a new task
router.post('/projects/:id/tasks', TaskController.createTask);

// PUT /api/tasks/:id - Update a task
router.put('/tasks/:id', TaskController.updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete('/tasks/:id', TaskController.deleteTask);

// PUT /api/tasks/:id/move - Move a task (change status and/or position)
router.put('/tasks/:id/move', TaskController.moveTask);

export { router as taskRoutes };
import { Router } from 'express';
import { UserPresenceController } from '../controllers/userPresenceController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/projects/:projectId', UserPresenceController.getProjectPresence);
router.get('/projects/:projectId/count', UserPresenceController.getProjectUserCount);
router.get('/stats', requireAdmin, UserPresenceController.getPresenceStats);
router.get('/projects', requireAdmin, UserPresenceController.getAllProjectPresence);
router.post('/cleanup', requireAdmin, UserPresenceController.cleanupStaleConnections);
router.get('/debug', requireAdmin, UserPresenceController.getDebugInfo);

export default router;
import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/authMiddleware';
import { 
  aiRateLimit, 
  aiExpensiveRateLimit, 
  aiGlobalRateLimit,
  checkAIQuota 
} from '../middleware/aiRateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Add logging middleware for all AI routes
router.use((req, _res, next) => {
  console.log(`[AI Routes] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    authorization: req.get('Authorization') ? 'Bearer ***' : 'None',
    timestamp: new Date().toISOString()
  });
  next();
});

// Health endpoint (no auth required for testing)
router.get('/health', (_req, res) => {
  console.log('[AI Routes] Health endpoint hit');
  res.json({
    success: true,
    message: 'AI routes are healthy',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL
    }
  });
});

// Apply global rate limiting and authentication to all AI routes (except health)
router.use(aiGlobalRateLimit);
router.use(authenticateToken);
router.use(checkAIQuota);

// Project Summary Routes
// POST /api/ai/projects/:id/summary - Generate project summary (expensive operation)
router.post(
  '/projects/:id/summary',
  aiExpensiveRateLimit,
  aiRateLimit,
  asyncHandler(AIController.generateProjectSummary)
);

// GET /api/ai/projects/:id/summary/latest - Get latest project summary (less expensive)
router.get(
  '/projects/:id/summary/latest',
  aiRateLimit,
  asyncHandler(AIController.getLatestProjectSummary)
);

// Task Question Routes
// POST /api/ai/tasks/:id/question - Ask question about a task (expensive operation)
router.post(
  '/tasks/:id/question',
  aiExpensiveRateLimit,
  aiRateLimit,
  asyncHandler(AIController.answerTaskQuestion)
);

// GET /api/ai/tasks/:id/questions/history - Get question history for a task
router.get(
  '/tasks/:id/questions/history',
  aiRateLimit,
  asyncHandler(AIController.getTaskQuestionHistory)
);

// Conversation Management Routes
// GET /api/ai/conversations/:id - Get conversation details
router.get(
  '/conversations/:id',
  aiRateLimit,
  asyncHandler(AIController.getConversation)
);

// GET /api/ai/tasks/:id/conversations - Get all conversations for a task
router.get(
  '/tasks/:id/conversations',
  aiRateLimit,
  asyncHandler(AIController.getTaskConversations)
);

// AI Service Status Routes
// GET /api/ai/status - Get AI service status (no expensive rate limit)
router.get(
  '/status',
  aiRateLimit,
  asyncHandler(AIController.getAIStatus)
);

// Test endpoint to verify AI routes are working (bypass auth for testing)
router.get('/test-no-auth', (_, res) => {
  console.log('[AI Routes] Test endpoint hit (no auth)');
  res.json({
    success: true,
    message: 'AI routes are working',
    timestamp: new Date().toISOString(),
    environmentCheck: {
      hasGeminiKey: !!process.env['GEMINI_API_KEY'],
      geminiModel: process.env['GEMINI_MODEL'],
      nodeEnv: process.env['NODE_ENV']
    }
  });
});

// Test endpoint to verify AI routes are working (with auth)
router.get('/test', (req, res) => {
  console.log('[AI Routes] Test endpoint hit');
  res.json({
    success: true,
    message: 'AI routes are working',
    timestamp: new Date().toISOString(),
    user: req.user ? { id: req.user.userId } : null
  });
});

export { router as aiRoutes };
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';

// Rate limit configuration from environment variables
const AI_RATE_LIMIT_PER_USER = parseInt(process.env['AI_RATE_LIMIT_PER_USER'] || '10', 10);
const AI_RATE_LIMIT_WINDOW = parseInt(process.env['AI_RATE_LIMIT_WINDOW'] || '60000', 10); // 1 minute in ms
const AI_EXPENSIVE_RATE_LIMIT = parseInt(process.env['AI_EXPENSIVE_RATE_LIMIT'] || '10', 10);
const AI_EXPENSIVE_RATE_WINDOW = parseInt(process.env['AI_EXPENSIVE_RATE_WINDOW'] || '300000', 10); // 5 minutes in ms

/**
 * Rate limiter for AI endpoints - per user
 */
export const aiRateLimit = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW,
  max: AI_RATE_LIMIT_PER_USER,

  // Use user ID as the key for rate limiting
  keyGenerator: (req: Request): string => {
    // Prioritize user ID for authenticated users
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // For unauthenticated users, use a simple IP-based key
    // Note: express-rate-limit handles IPv6 normalization internally when using default behavior
    return `ip:${req.ip || 'unknown'}`;
  },

  // Custom error handler
  handler: (req: Request, res: Response): void => {
    const userId = req.user?.userId || 'anonymous';
    const endpoint = req.originalUrl;

    logger.warn('AI rate limit exceeded', {
      userId,
      endpoint,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const error = new RateLimitError(
      `Too many AI requests. Limit: ${AI_RATE_LIMIT_PER_USER} requests per ${AI_RATE_LIMIT_WINDOW / 1000} seconds`
    );

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          limit: AI_RATE_LIMIT_PER_USER,
          windowMs: AI_RATE_LIMIT_WINDOW,
          retryAfter: Math.ceil(AI_RATE_LIMIT_WINDOW / 1000)
        }
      },
      timestamp: new Date().toISOString()
    });
  },

  // Skip rate limiting for successful requests that return cached data
  skip: (_req: Request, res: Response): boolean => {
    // Skip rate limiting if response indicates cached data
    return res.locals['cached'] === true;
  },

  // Add rate limit info to response headers
  standardHeaders: true,
  legacyHeaders: false,

  // Store rate limit data in memory (for production, consider Redis)
  // store: undefined // Uses default memory store
});

/**
 * More restrictive rate limiter for expensive AI operations
 */
export const aiExpensiveRateLimit = rateLimit({
  windowMs: AI_EXPENSIVE_RATE_WINDOW,
  max: AI_EXPENSIVE_RATE_LIMIT,

  keyGenerator: (req: Request): string => {
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return `ip:${req.ip || 'unknown'}`;
  },

  handler: (req: Request, res: Response): void => {
    const userId = req.user?.userId || 'anonymous';
    const endpoint = req.originalUrl;

    logger.warn('AI expensive operation rate limit exceeded', {
      userId,
      endpoint,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const error = new RateLimitError(
      `Too many expensive AI operations. Limit: ${AI_EXPENSIVE_RATE_LIMIT} requests per ${AI_EXPENSIVE_RATE_WINDOW / 1000} seconds`
    );

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          limit: AI_EXPENSIVE_RATE_LIMIT,
          windowMs: AI_EXPENSIVE_RATE_WINDOW,
          retryAfter: Math.ceil(AI_EXPENSIVE_RATE_WINDOW / 1000)
        }
      },
      timestamp: new Date().toISOString()
    });
  },

  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Global rate limiter for all AI endpoints combined
 */
export const aiGlobalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute globally

  keyGenerator: (): string => {
    return 'global-ai-limit';
  },

  handler: (req: Request, res: Response): void => {
    logger.warn('Global AI rate limit exceeded', {
      endpoint: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const error = new RateLimitError(
      'AI service is temporarily overloaded. Please try again later.'
    );

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          type: 'global_limit',
          retryAfter: 60
        }
      },
      timestamp: new Date().toISOString()
    });
  },

  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware to check AI service quota before processing requests
 */
export const checkAIQuota = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    // Import aiService here to avoid circular dependencies
    const { aiService } = await import('../services/aiService');

    const quotaStatus = await aiService.checkQuotaStatus();

    if (!quotaStatus.available) {
      logger.warn('AI service quota exhausted', {
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        quotaRemaining: quotaStatus.requestsRemaining
      });

      const error = new RateLimitError(
        'AI service quota has been exhausted. Please try again later.'
      );

      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            type: 'quota_exhausted',
            quotaLimit: quotaStatus.quotaLimit,
            quotaRemaining: quotaStatus.requestsRemaining,
            resetTime: quotaStatus.resetTime
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add quota info to response headers for client awareness
    res.set({
      'X-AI-Quota-Limit': quotaStatus.quotaLimit.toString(),
      'X-AI-Quota-Remaining': quotaStatus.requestsRemaining.toString(),
      'X-AI-Quota-Reset': quotaStatus.resetTime?.toISOString() || ''
    });

    next();
  } catch (error) {
    logger.error('Error checking AI quota:', {
      userId: req.user?.userId,
      endpoint: req.originalUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // If quota check fails, allow the request to proceed
    // This ensures the service remains available even if quota checking has issues
    next();
  }
};
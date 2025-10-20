import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/authService'
import { logger } from '../utils/logger'
import { AuthenticationError, AuthorizationError } from '../utils/errors'
import { asyncHandler } from './errorHandler'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: string
      }
    }
  }
}

export const authenticateToken = asyncHandler(async (req: Request, _: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    throw new AuthenticationError('Access token required')
  }

  try {
    const decoded = AuthService.verifyToken(token)
    req.user = decoded
    next()
  } catch (error: any) {
    logger.error('Token verification error:', {
      error: error.message,
      token: token.substring(0, 20) + '...', // Log partial token for debugging
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    })

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired')
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token format')
    } else if (error.name === 'NotBeforeError') {
      throw new AuthenticationError('Token not active yet')
    } else {
      throw new AuthenticationError('Token verification failed')
    }
  }
})

export const requireRole = (roles: string[]) => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required')
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions:', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl,
        method: req.method,
      })
      
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`)
    }

    next()
  })
}

export const requireAdmin = requireRole(['admin'])
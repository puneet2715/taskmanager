import { Request, Response, NextFunction } from 'express'
import { AuthService, AuthTokenPayload } from '../services/authService'
import { logger } from '../utils/logger'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    })
  }

  try {
    const decoded = AuthService.verifyToken(token)
    req.user = decoded
    return next()
  } catch (error) {
    logger.error('Token verification error:', error)
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    return next()
  }
}

export const requireAdmin = requireRole(['admin'])
export const requireUser = requireRole(['user', 'admin'])
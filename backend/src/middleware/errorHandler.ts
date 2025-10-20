import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError, isAppError, ValidationError, AuthenticationError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

// Handle Mongoose validation errors
const handleMongooseValidationError = (error: mongoose.Error.ValidationError): ValidationError => {
  const errors: Record<string, string[]> = {};
  
  Object.values(error.errors).forEach((err) => {
    const field = err.path;
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(err.message);
  });

  return new ValidationError('Validation failed', { fields: errors });
};

// Handle Mongoose cast errors
const handleMongooseCastError = (error: mongoose.Error.CastError): ValidationError => {
  return new ValidationError(`Invalid ${error.kind} for field '${error.path}'`, {
    field: error.path,
    value: error.value,
    expectedType: error.kind,
  });
};

// Handle Mongoose duplicate key errors
const handleMongooseDuplicateKeyError = (error: any): ValidationError => {
  const field = Object.keys(error.keyValue || {})[0];
  
  if (!field) {
    return new ValidationError('Duplicate key error occurred', {
      field: 'unknown',
      value: null,
      constraint: 'unique',
    });
  }

  const value = error.keyValue[field];
  
  return new ValidationError(`Duplicate value for field '${field}'`, {
    field,
    value,
    constraint: 'unique',
  });
};

// Handle JWT errors
const handleJWTError = (error: JsonWebTokenError): AuthenticationError => {
  if (error instanceof TokenExpiredError) {
    return new AuthenticationError('Token has expired');
  }
  return new AuthenticationError('Invalid token');
};

// Handle database connection errors
const handleDatabaseConnectionError = (error: any): DatabaseError => {
  return new DatabaseError('Database connection failed', {
    code: error.code,
    message: error.message,
  });
};

// Convert operational errors to AppError
const convertToAppError = (error: any): AppError => {
  // Mongoose validation error
  if (error instanceof mongoose.Error.ValidationError) {
    return handleMongooseValidationError(error);
  }

  // Mongoose cast error
  if (error instanceof mongoose.Error.CastError) {
    return handleMongooseCastError(error);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return handleMongooseDuplicateKeyError(error);
  }

  // JWT errors
  if (error instanceof JsonWebTokenError) {
    return handleJWTError(error);
  }

  // Database connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    return handleDatabaseConnectionError(error);
  }

  // If it's already an AppError, return as is
  if (isAppError(error)) {
    return error;
  }

  // Default to internal server error
  return new AppError(
    process.env['NODE_ENV'] === 'production' ? 'Something went wrong' : error.message,
    500,
    'INTERNAL_SERVER_ERROR',
    false,
    process.env['NODE_ENV'] === 'development' ? error.stack : undefined
  );
};

// Format error response
const formatErrorResponse = (error: AppError, requestId?: string): ErrorResponse => {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
};

// Log error with appropriate level
const logError = (error: AppError, req: Request): void => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    timestamp: new Date().toISOString(),
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error:', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error:', logData);
  } else {
    logger.info('Error:', logData);
  }
};

// Main error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Convert to AppError
  const appError = convertToAppError(error);

  // Log the error
  logError(appError, req);

  // Send error response
  const errorResponse = formatErrorResponse(appError, req.headers['x-request-id'] as string);
  
  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  const errorResponse = formatErrorResponse(error);
  
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json(errorResponse);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });

  // In production, you might want to gracefully shut down the server
  if (process.env['NODE_ENV'] === 'production') {
    process.exit(1);
  }
};

// Uncaught exception handler
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  // Always exit on uncaught exceptions
  process.exit(1);
};

// Database connection error handler with retry logic
export const handleDatabaseError = async (error: any, retryCount: number = 0): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

  logger.error(`Database connection error (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
    error: error.message,
    code: error.code,
    retryCount,
    nextRetryIn: retryCount < maxRetries ? `${retryDelay}ms` : 'no retry',
  });

  if (retryCount < maxRetries) {
    logger.info(`Retrying database connection in ${retryDelay}ms...`);
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // This would be called from the database connection logic
          resolve();
        } catch (retryError) {
          await handleDatabaseError(retryError, retryCount + 1);
          reject(retryError);
        }
      }, retryDelay);
    });
  } else {
    logger.error('Max database connection retries exceeded. Shutting down...');
    process.exit(1);
  }
};

// Validation helper for request data
export const validateRequest = (schema: any, data: any): void => {
  const { error } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const details: Record<string, string[]> = {};
    
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });

    throw new ValidationError('Request validation failed', { fields: details });
  }
};
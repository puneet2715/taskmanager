// Load environment variables first, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { isDatabaseReady, getDatabaseState } from './config/database';
import { runMigrations } from './migrations';
import { authRoutes } from './routes/authRoutes';
import { projectRoutes } from './routes/projectRoutes';
import { taskRoutes } from './routes/taskRoutes';
import { userRoutes } from './routes/userRoutes';
import userPresenceRoutes from './routes/userPresenceRoutes';
import { aiRoutes } from './routes/aiRoutes';
import { logger } from './utils/logger';
import { validateEnvironmentVariables, logEnvironmentInfo } from './utils/envValidation';
import { SocketServer } from './socket/socketServer';
import { 
  errorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';

// Environment variables already loaded at the top

// Validate environment variables early in the startup process
try {
  validateEnvironmentVariables();
  logEnvironmentInfo();
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

// Set up global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

const app = express();
const httpServer = createServer(app);
const PORT = process.env['PORT'] || '5000';

// Initialize Socket.io server
let socketServer: SocketServer;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - publicly accessible (no authentication required)
app.get('/health', async (_req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    const statusCode = healthStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        database: 'error',
        redis: 'error',
        socketio: 'error'
      },
      error: 'Health check failed'
    });
  }
});

// Socket test endpoint for debugging
app.get('/socket-test', (_req, res) => {
  res.json({
    socketServer: socketServer ? 'initialized' : 'not initialized',
    activeConnections: socketServer ? socketServer.getActiveSocketCount() : 0,
    connectedProjects: socketServer ? socketServer.getConnectedProjectsCount() : 0,
    totalConnectedUsers: socketServer ? socketServer.getTotalConnectedUsers() : 0
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/presence', userPresenceRoutes);
app.use('/api/ai', aiRoutes);

// Basic route
app.get('/', (_req, res) => {
  res.json({
    message: 'Collaborative Task Manager API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Health status checking function
async function getHealthStatus() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const version = '1.0.0';

  // Check database connectivity
  let databaseStatus = 'disconnected';
  try {
    if (isDatabaseReady()) {
      databaseStatus = 'connected';
    } else {
      databaseStatus = getDatabaseState();
    }
  } catch (error) {
    logger.error('Database health check error:', error);
    databaseStatus = 'error';
  }

  // Check Redis connectivity (if Redis client is implemented)
  let redisStatus = 'not_configured';
  try {
    // Since Redis client is not implemented yet, we'll check if the URL is configured
    if (process.env['REDIS_URL']) {
      redisStatus = 'configured_not_connected';
    }
  } catch (error) {
    logger.error('Redis health check error:', error);
    redisStatus = 'error';
  }

  // Check Socket.io server status
  let socketioStatus = 'inactive';
  try {
    if (socketServer) {
      const activeConnections = socketServer.getActiveSocketCount();
      const connectedProjects = socketServer.getConnectedProjectsCount();
      socketioStatus = 'active';
      
      return {
        status: databaseStatus === 'connected' ? 'OK' : 'DEGRADED',
        timestamp,
        uptime,
        version,
        services: {
          database: databaseStatus,
          redis: redisStatus,
          socketio: socketioStatus
        },
        metrics: {
          activeSocketConnections: activeConnections,
          connectedProjects: connectedProjects,
          totalConnectedUsers: socketServer.getTotalConnectedUsers()
        }
      };
    }
  } catch (error) {
    logger.error('Socket.io health check error:', error);
    socketioStatus = 'error';
  }

  // Determine overall status
  const overallStatus = databaseStatus === 'connected' ? 'OK' : 'ERROR';

  return {
    status: overallStatus,
    timestamp,
    uptime,
    version,
    services: {
      database: databaseStatus,
      redis: redisStatus,
      socketio: socketioStatus
    },
    socketio: socketServer ? {
      activeConnections: socketServer.getActiveSocketCount(),
      connectedProjects: socketServer.getConnectedProjectsCount(),
      totalConnectedUsers: socketServer.getTotalConnectedUsers()
    } : null
  };
}

// Initialize database connection and start server
const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');
    
    // Run database migrations
    await runMigrations();
    logger.info('Database migrations completed');
    
    // Initialize Socket.io server
    socketServer = new SocketServer(httpServer);
    logger.info('Socket.io server initialized');
    
    httpServer.listen(parseInt(PORT, 10), () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 Socket.io server ready for connections`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  startServer();
}

// Export both app and socketServer for use in other modules
export default app;
export { socketServer };

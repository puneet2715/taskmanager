import mongoose from 'mongoose';
import { logger } from '../utils/logger';
// import { DatabaseError } from '../utils/errors';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 5000; // 5 seconds

  private constructor() { }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private getConfig(): DatabaseConfig {
    const uri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/collaborative-task-manager';
    // const uri = 'mongodb://admin:SecureRootPass2024!@146.56.48.212:2109/?authSource=admin';

    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    return { uri, options };
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    const { uri, options } = this.getConfig();

    try {
      await this.connectWithRetry(uri, options);
      this.setupEventHandlers();
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database after maximum retries', error);
      throw error;
    }
  }

  private async connectWithRetry(uri: string, options: mongoose.ConnectOptions): Promise<void> {
    while (this.connectionAttempts < this.maxRetries) {
      try {
        this.connectionAttempts++;
        logger.info(`Database connection attempt ${this.connectionAttempts}/${this.maxRetries}`);

        await mongoose.connect(uri, options);
        return;
      } catch (error) {
        logger.error(`Database connection attempt ${this.connectionAttempts} failed:`, error);

        if (this.connectionAttempts >= this.maxRetries) {
          throw new Error(`Failed to connect to database after ${this.maxRetries} attempts`);
        }

        logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.delay(this.retryDelay);
      }
    }
  }

  private setupEventHandlers(): void {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;

      // Attempt to reconnect
      if (process.env['NODE_ENV'] !== 'test') {
        this.reconnect();
      }
    });

    // Handle application termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  private async reconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Attempting to reconnect to database...');
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection failed:', error);
        // Retry after delay
        setTimeout(() => this.reconnect(), this.retryDelay);
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, closing database connection...');
    await this.disconnect();
    process.exit(0);
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();

// Export connection function for convenience
export const connectDatabase = () => database.connect();
export const disconnectDatabase = () => database.disconnect();
export const isDatabaseReady = () => database.isConnectionReady();
export const getDatabaseState = () => database.getConnectionState();
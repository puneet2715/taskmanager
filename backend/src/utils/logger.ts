interface LogLevel {
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] === 'development';
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.isDevelopment) {
      console.log(formattedMessage, ...args);
    } else {
      // In production, you might want to use a proper logging service
      console.log(formattedMessage, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    this.formatMessage(LOG_LEVELS.INFO, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.formatMessage(LOG_LEVELS.WARN, message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.formatMessage(LOG_LEVELS.ERROR, message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      this.formatMessage(LOG_LEVELS.DEBUG, message, ...args);
    }
  }
}

export const logger = new Logger();
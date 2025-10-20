import { logger } from './logger';

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  // Database
  'MONGODB_URI',
  'REDIS_URL',
  
  // Authentication
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  
  // API URLs
  'NEXT_PUBLIC_API_URL',
  'INTERNAL_API_URL',
  'FRONTEND_URL',
  
  // OAuth (optional but recommended)
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

/**
 * Optional environment variables with default values
 */
const OPTIONAL_ENV_VARS = {
  PORT: '5000',
  NODE_ENV: 'development'
};

/**
 * Validates that all required environment variables are present
 * @throws Error if any required environment variables are missing
 */
export function validateEnvironmentVariables(): void {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  // Set default values for optional variables
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      warnings.push(`${varName} not set, using default: ${defaultValue}`);
    }
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    logger.warn('Environment variable warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  // Fail if required variables are missing
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:');
    missingVars.forEach(varName => logger.error(`  - ${varName}`));
    logger.error('Please check your .env file and ensure all required variables are set.');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate specific formats
  validateEnvironmentFormats();

  logger.info('✅ Environment validation passed');
}

/**
 * Validates the format of specific environment variables
 */
function validateEnvironmentFormats(): void {
  const errors: string[] = [];

  // Validate MongoDB URI format
  const mongoUri = process.env['MONGODB_URI'];
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  // Validate Redis URL format
  const redisUrl = process.env['REDIS_URL'];
  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    errors.push('REDIS_URL must start with redis:// or rediss://');
  }

  // Validate URL formats
  const urlVars = ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL', 'FRONTEND_URL'];
  for (const varName of urlVars) {
    const value = process.env[varName];
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      errors.push(`${varName} must be a valid HTTP/HTTPS URL`);
    }
  }

  // Validate JWT secrets are not empty or default values
  const jwtSecret = process.env['JWT_SECRET'];
  const nextAuthSecret = process.env['NEXTAUTH_SECRET'];
  
  if (jwtSecret && (jwtSecret === 'your-jwt-secret-here' || jwtSecret.length < 32)) {
    errors.push('JWT_SECRET must be a secure secret (at least 32 characters)');
  }
  
  if (nextAuthSecret && (nextAuthSecret === 'your-nextauth-secret-here' || nextAuthSecret.length < 32)) {
    errors.push('NEXTAUTH_SECRET must be a secure secret (at least 32 characters)');
  }

  if (errors.length > 0) {
    logger.error('Environment variable format errors:');
    errors.forEach(error => logger.error(`  - ${error}`));
    throw new Error(`Invalid environment variable formats: ${errors.join(', ')}`);
  }
}

/**
 * Logs the current environment configuration (without sensitive values)
 */
export function logEnvironmentInfo(): void {
  logger.info('🔧 Environment Configuration:');
  logger.info(`  - NODE_ENV: ${process.env['NODE_ENV']}`);
  logger.info(`  - PORT: ${process.env['PORT']}`);
  logger.info(`  - FRONTEND_URL: ${process.env['FRONTEND_URL']}`);
  logger.info(`  - NEXT_PUBLIC_API_URL: ${process.env['NEXT_PUBLIC_API_URL']}`);
  logger.info(`  - INTERNAL_API_URL: ${process.env['INTERNAL_API_URL']}`);
  logger.info(`  - NEXTAUTH_URL: ${process.env['NEXTAUTH_URL']}`);
  logger.info(`  - MongoDB URI: ${process.env['MONGODB_URI'] ? '[SET]' : '[NOT SET]'}`);
  logger.info(`  - Redis URL: ${process.env['REDIS_URL'] ? '[SET]' : '[NOT SET]'}`);
  logger.info(`  - JWT Secret: ${process.env['JWT_SECRET'] ? '[SET]' : '[NOT SET]'}`);
  logger.info(`  - NextAuth Secret: ${process.env['NEXTAUTH_SECRET'] ? '[SET]' : '[NOT SET]'}`);
  logger.info(`  - GitHub OAuth: ${process.env['GITHUB_CLIENT_ID'] ? '[CONFIGURED]' : '[NOT CONFIGURED]'}`);
  logger.info(`  - Google OAuth: ${process.env['GOOGLE_CLIENT_ID'] ? '[CONFIGURED]' : '[NOT CONFIGURED]'}`);
}
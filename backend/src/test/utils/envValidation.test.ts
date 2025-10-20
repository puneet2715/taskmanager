import { validateEnvironmentVariables, logEnvironmentInfo } from '../../utils/envValidation';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass validation when all required variables are set', () => {
      // Set all required environment variables
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['JWT_SECRET'] = 'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_SECRET'] = 'another-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_URL'] = 'https://example.com';
      process.env['NEXT_PUBLIC_API_URL'] = 'https://api.example.com';
      process.env['INTERNAL_API_URL'] = 'http://backend:5000';
      process.env['FRONTEND_URL'] = 'https://example.com';
      process.env['GITHUB_CLIENT_ID'] = 'github-client-id';
      process.env['GITHUB_CLIENT_SECRET'] = 'github-client-secret';
      process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error when required variables are missing', () => {
      // Clear all environment variables
      process.env = {};

      expect(() => validateEnvironmentVariables()).toThrow('Missing required environment variables');
    });

    it('should throw error for invalid MongoDB URI format', () => {
      // Set all required variables but with invalid MongoDB URI
      process.env['MONGODB_URI'] = 'invalid-uri';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['JWT_SECRET'] = 'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_SECRET'] = 'another-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_URL'] = 'https://example.com';
      process.env['NEXT_PUBLIC_API_URL'] = 'https://api.example.com';
      process.env['INTERNAL_API_URL'] = 'http://backend:5000';
      process.env['FRONTEND_URL'] = 'https://example.com';
      process.env['GITHUB_CLIENT_ID'] = 'github-client-id';
      process.env['GITHUB_CLIENT_SECRET'] = 'github-client-secret';
      process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';

      expect(() => validateEnvironmentVariables()).toThrow('Invalid environment variable formats');
    });

    it('should throw error for invalid Redis URL format', () => {
      // Set all required variables but with invalid Redis URL
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      process.env['REDIS_URL'] = 'invalid-redis-url';
      process.env['JWT_SECRET'] = 'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_SECRET'] = 'another-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_URL'] = 'https://example.com';
      process.env['NEXT_PUBLIC_API_URL'] = 'https://api.example.com';
      process.env['INTERNAL_API_URL'] = 'http://backend:5000';
      process.env['FRONTEND_URL'] = 'https://example.com';
      process.env['GITHUB_CLIENT_ID'] = 'github-client-id';
      process.env['GITHUB_CLIENT_SECRET'] = 'github-client-secret';
      process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';

      expect(() => validateEnvironmentVariables()).toThrow('Invalid environment variable formats');
    });

    it('should throw error for weak JWT secrets', () => {
      // Set all required variables but with weak JWT secret
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['JWT_SECRET'] = 'weak-secret';
      process.env['NEXTAUTH_SECRET'] = 'another-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_URL'] = 'https://example.com';
      process.env['NEXT_PUBLIC_API_URL'] = 'https://api.example.com';
      process.env['INTERNAL_API_URL'] = 'http://backend:5000';
      process.env['FRONTEND_URL'] = 'https://example.com';
      process.env['GITHUB_CLIENT_ID'] = 'github-client-id';
      process.env['GITHUB_CLIENT_SECRET'] = 'github-client-secret';
      process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';

      expect(() => validateEnvironmentVariables()).toThrow('Invalid environment variable formats');
    });

    it('should set default values for optional variables', () => {
      // Set all required variables
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['JWT_SECRET'] = 'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_SECRET'] = 'another-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env['NEXTAUTH_URL'] = 'https://example.com';
      process.env['NEXT_PUBLIC_API_URL'] = 'https://api.example.com';
      process.env['INTERNAL_API_URL'] = 'http://backend:5000';
      process.env['FRONTEND_URL'] = 'https://example.com';
      process.env['GITHUB_CLIENT_ID'] = 'github-client-id';
      process.env['GITHUB_CLIENT_SECRET'] = 'github-client-secret';
      process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';

      // Clear optional variables
      delete process.env['PORT'];
      delete process.env['NODE_ENV'];

      validateEnvironmentVariables();

      expect(process.env['PORT']).toBe('5000');
      expect(process.env['NODE_ENV']).toBe('development');
    });
  });

  describe('logEnvironmentInfo', () => {
    it('should not throw when logging environment info', () => {
      // Set some environment variables
      process.env['NODE_ENV'] = 'test';
      process.env['PORT'] = '3000';
      process.env['FRONTEND_URL'] = 'https://example.com';

      expect(() => logEnvironmentInfo()).not.toThrow();
    });
  });
});
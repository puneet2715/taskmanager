import toast from 'react-hot-toast';
import {
  isNetworkError,
  isAuthError,
  isValidationError,
  isServerError,
  getErrorMessage,
  getErrorDetails,
  handleApiError,
  withRetry,
  handleQueryError,
  handleMutationError,
  handleSocketError,
  handleFormError,
  getErrorRecoveryAction,
} from '@/lib/error-utils';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockToast = toast as jest.Mocked<typeof toast>;

describe('error-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('error classification', () => {
    describe('isNetworkError', () => {
      it('identifies network errors correctly', () => {
        expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
        expect(isNetworkError(new Error('network error'))).toBe(true);
        expect(isNetworkError(new Error('ERR_NETWORK'))).toBe(true);
        expect(isNetworkError(new Error('Generic error'))).toBe(false);
      });

      it('handles NetworkError type', () => {
        const error = new Error('Network failed');
        error.name = 'NetworkError';
        expect(isNetworkError(error)).toBe(true);
      });
    });

    describe('isAuthError', () => {
      it('identifies auth errors by status code', () => {
        const error401 = new Error('Unauthorized') as any;
        error401.status = 401;
        expect(isAuthError(error401)).toBe(true);

        const error403 = new Error('Forbidden') as any;
        error403.status = 403;
        expect(isAuthError(error403)).toBe(true);
      });

      it('identifies auth errors by message', () => {
        expect(isAuthError(new Error('Unauthorized'))).toBe(true);
        expect(isAuthError(new Error('Authentication failed'))).toBe(true);
        expect(isAuthError(new Error('Generic error'))).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('identifies validation errors by status code', () => {
        const error400 = new Error('Bad Request') as any;
        error400.status = 400;
        expect(isValidationError(error400)).toBe(true);

        const error422 = new Error('Unprocessable Entity') as any;
        error422.status = 422;
        expect(isValidationError(error422)).toBe(true);
      });

      it('identifies validation errors by name', () => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        expect(isValidationError(error)).toBe(true);
      });
    });

    describe('isServerError', () => {
      it('identifies server errors by status code', () => {
        const error500 = new Error('Internal Server Error') as any;
        error500.status = 500;
        expect(isServerError(error500)).toBe(true);

        const error503 = new Error('Service Unavailable') as any;
        error503.status = 503;
        expect(isServerError(error503)).toBe(true);

        const error400 = new Error('Bad Request') as any;
        error400.status = 400;
        expect(isServerError(error400)).toBe(false);
      });
    });
  });

  describe('error message extraction', () => {
    it('extracts message from Error objects', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('handles string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('handles objects with message property', () => {
      expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('provides fallback for unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage({})).toBe('An unexpected error occurred');
    });
  });

  describe('error details extraction', () => {
    it('extracts details from ApiError objects', () => {
      const error = new Error('Test error') as any;
      error.details = { field: 'value' };
      expect(getErrorDetails(error)).toEqual({ field: 'value' });
    });

    it('returns null for errors without details', () => {
      expect(getErrorDetails(new Error('Test error'))).toBeNull();
      expect(getErrorDetails('string error')).toBeNull();
    });
  });

  describe('handleApiError', () => {
    it('handles network errors', () => {
      const error = new Error('Failed to fetch');
      handleApiError(error, 'test context');
      
      expect(mockToast.error).toHaveBeenCalledWith('Network error. Please check your connection and try again.');
    });

    it('handles auth errors', () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      handleApiError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Authentication required. Please sign in again.');
    });

    it('handles validation errors', () => {
      const error = new Error('Validation failed') as any;
      error.status = 400;
      handleApiError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Validation error: Validation failed');
    });

    it('handles server errors', () => {
      const error = new Error('Internal Server Error') as any;
      error.status = 500;
      handleApiError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Server error. Please try again later.');
    });

    it('handles generic errors', () => {
      const error = new Error('Generic error');
      handleApiError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Generic error');
    });
  });

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, { maxAttempts: 3, delay: 10 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws after max attempts', async () => {
      const error = new Error('Persistent failure');
      const fn = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(fn, { maxAttempts: 2, delay: 10 })).rejects.toThrow('Persistent failure');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does not retry auth errors', async () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      const fn = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(fn, { maxAttempts: 3, delay: 10 })).rejects.toThrow('Unauthorized');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      await withRetry(fn, { maxAttempts: 3, delay: 10, onRetry });
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('handleFormError', () => {
    it('handles validation errors with field details', () => {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      error.fields = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      };
      
      const result = handleFormError(error);
      
      expect(result).toEqual({
        email: 'Invalid email format',
        password: 'Password too short',
      });
    });

    it('handles generic errors', () => {
      const error = new Error('Generic error');
      const result = handleFormError(error);
      
      expect(result).toEqual({
        _form: 'Generic error',
      });
    });
  });

  describe('getErrorRecoveryAction', () => {
    it('provides network error recovery', () => {
      const error = new Error('Failed to fetch');
      const action = getErrorRecoveryAction(error);
      
      expect(action).toEqual({
        action: 'Check connection',
        handler: expect.any(Function),
      });
    });

    it('provides auth error recovery', () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      const action = getErrorRecoveryAction(error);
      
      expect(action).toEqual({
        action: 'Sign in again',
        handler: expect.any(Function),
      });
    });

    it('provides server error recovery', () => {
      const error = new Error('Internal Server Error') as any;
      error.status = 500;
      const action = getErrorRecoveryAction(error);
      
      expect(action).toEqual({
        action: 'Try again later',
        handler: expect.any(Function),
      });
    });

    it('returns null for unrecoverable errors', () => {
      const error = new Error('Generic error');
      const action = getErrorRecoveryAction(error);
      
      expect(action).toBeNull();
    });
  });
});
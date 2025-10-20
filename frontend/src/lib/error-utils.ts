import toast from 'react-hot-toast';

// Error types
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface NetworkError extends Error {
  name: 'NetworkError';
}

export interface ValidationError extends Error {
  name: 'ValidationError';
  fields?: Record<string, string[]>;
}

// Error classification
export const isNetworkError = (error: unknown): error is NetworkError => {
  if (error instanceof Error) {
    return error.name === 'NetworkError' ||
           error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('ERR_NETWORK');
  }
  return false;
};

export const isAuthError = (error: unknown): error is ApiError => {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return apiError.status === 401 || 
           apiError.status === 403 ||
           error.message.includes('Unauthorized') ||
           error.message.includes('Authentication failed');
  }
  return false;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return error.name === 'ValidationError' ||
           apiError.status === 400 ||
           apiError.status === 422;
  }
  return false;
};

export const isServerError = (error: unknown): error is ApiError => {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return apiError.status !== undefined && apiError.status >= 500;
  }
  return false;
};

// Error message extraction
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unexpected error occurred';
};

export const getErrorDetails = (error: unknown): any => {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return apiError.details || null;
  }
  return null;
};

// Error handling strategies
export const handleApiError = (error: unknown, context?: string): void => {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  if (isNetworkError(error)) {
    toast.error('Network error. Please check your connection and try again.');
  } else if (isAuthError(error)) {
    toast.error('Authentication required. Please sign in again.');
    // Optionally redirect to login
    // window.location.href = '/auth/signin';
  } else if (isValidationError(error)) {
    const message = getErrorMessage(error);
    toast.error(`Validation error: ${message}`);
  } else if (isServerError(error)) {
    toast.error('Server error. Please try again later.');
  } else {
    const message = getErrorMessage(error);
    toast.error(message || 'Something went wrong. Please try again.');
  }
};

// Retry logic
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }

      // Don't retry auth errors or validation errors
      if (isAuthError(error) || isValidationError(error)) {
        break;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      // Calculate delay with optional backoff
      const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError;
};

// Error boundary helpers
export const logError = (error: Error, errorInfo?: any): void => {
  console.error('Error caught by boundary:', error, errorInfo);
  
  // In production, send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    // Example: LogRocket.captureException(error);
  }
};

// React Query error handling
export const handleQueryError = (error: unknown, queryKey?: string[]): void => {
  console.error(`Query error${queryKey ? ` for ${queryKey.join('.')}` : ''}:`, error);
  
  // Don't show toast for auth errors in queries - let the auth system handle it
  if (isAuthError(error)) {
    return;
  }
  
  if (isNetworkError(error)) {
    toast.error('Connection lost. Data may be outdated.');
  } else {
    const message = getErrorMessage(error);
    toast.error(`Failed to load data: ${message}`);
  }
};

// Mutation error handling
export const handleMutationError = (error: unknown, operation?: string): void => {
  console.error(`Mutation error${operation ? ` for ${operation}` : ''}:`, error);
  
  if (isNetworkError(error)) {
    toast.error('Network error. Changes may not have been saved.');
  } else if (isValidationError(error)) {
    const message = getErrorMessage(error);
    toast.error(`Validation failed: ${message}`);
  } else if (isAuthError(error)) {
    toast.error('Authentication required. Please sign in again.');
  } else {
    const message = getErrorMessage(error);
    toast.error(`Operation failed: ${message}`);
  }
};

// Socket error handling
export const handleSocketError = (error: unknown, event?: string): void => {
  console.error(`Socket error${event ? ` for ${event}` : ''}:`, error);
  
  const message = getErrorMessage(error);
  toast.error(`Real-time update failed: ${message}`);
};

// Form error handling
export const handleFormError = (error: unknown): Record<string, string> => {
  if (isValidationError(error)) {
    const validationError = error as ValidationError;
    if (validationError.fields) {
      // Convert field errors to form format
      const formErrors: Record<string, string> = {};
      Object.entries(validationError.fields).forEach(([field, messages]) => {
        formErrors[field] = messages[0] || 'Invalid value';
      });
      return formErrors;
    }
  }
  
  // Generic error
  return { _form: getErrorMessage(error) };
};

// Error recovery suggestions
export const getErrorRecoveryAction = (error: unknown): {
  action: string;
  handler: () => void;
} | null => {
  if (isNetworkError(error)) {
    return {
      action: 'Check connection',
      handler: () => {
        // Could open network diagnostics or retry
        window.location.reload();
      }
    };
  }
  
  if (isAuthError(error)) {
    return {
      action: 'Sign in again',
      handler: () => {
        window.location.href = '/auth/signin';
      }
    };
  }
  
  if (isServerError(error)) {
    return {
      action: 'Try again later',
      handler: () => {
        // Could implement a retry mechanism
        setTimeout(() => window.location.reload(), 5000);
      }
    };
  }
  
  return null;
};
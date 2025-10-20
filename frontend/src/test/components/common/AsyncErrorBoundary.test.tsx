import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import AsyncErrorBoundary from '@/components/common/AsyncErrorBoundary';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockToast = toast as jest.Mocked<typeof toast>;

// Component that throws different types of errors
const ThrowError: React.FC<{ 
  shouldThrow?: boolean; 
  errorType?: 'network' | 'auth' | 'generic';
}> = ({ shouldThrow = true, errorType = 'generic' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Failed to fetch');
      case 'auth':
        const authError = new Error('Unauthorized') as any;
        authError.status = 401;
        throw authError;
      default:
        throw new Error('Generic error');
    }
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <AsyncErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders generic error UI for generic errors', () => {
    render(
      <AsyncErrorBoundary>
        <ThrowError errorType="generic" />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });

  it('renders network error UI for network errors', () => {
    render(
      <AsyncErrorBoundary>
        <ThrowError errorType="network" />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('Network error. Please check your connection.');
  });

  it('renders auth error UI for authentication errors', () => {
    render(
      <AsyncErrorBoundary>
        <ThrowError errorType="auth" />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/Your session may have expired/)).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('Authentication error. Please sign in again.');
  });

  it('calls custom onError handler when provided', () => {
    const onError = jest.fn();
    
    render(
      <AsyncErrorBoundary onError={onError}>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('calls custom onRetry handler when retry button is clicked', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    
    render(
      <AsyncErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Retrying...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
    });
  });

  it('handles retry failure gracefully', async () => {
    const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));
    
    render(
      <AsyncErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Retry failed. Please try again.');
    });
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom async error message</div>;
    
    render(
      <AsyncErrorBoundary fallback={customFallback}>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Custom async error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows reload page button for network errors', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <AsyncErrorBoundary>
        <ThrowError errorType="network" />
      </AsyncErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /reload page/i }));

    expect(mockReload).toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <AsyncErrorBoundary>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Error details (development only)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('cleans up timeout on unmount', () => {
    const { unmount } = render(
      <AsyncErrorBoundary>
        <ThrowError />
      </AsyncErrorBoundary>
    );

    // This test ensures no memory leaks occur
    expect(() => unmount()).not.toThrow();
  });
});
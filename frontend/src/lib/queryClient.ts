import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (Socket.io handles this)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Retry with 1 second delay
      retryDelay: 1000,
    },
  },
});

// Error handler for global query errors
export const handleQueryError = (error: any) => {
  console.error('Query error:', error);
  
  // Handle specific error types
  if (error?.status === 401) {
    // Redirect to login on authentication errors
    window.location.href = '/auth/signin';
  } else if (error?.status >= 500) {
    // Show generic error message for server errors
    console.error('Server error occurred');
  }
};

// Set up global error handler
queryClient.setMutationDefaults(['*'], {
  onError: handleQueryError,
});
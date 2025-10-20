import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes React Query provider
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries in tests
      gcTime: 0, // Disable garbage collection
    },
    mutations: {
      retry: false,
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Mock fetch function for testing
export const mockFetch = (response: any, ok: boolean = true, status: number = 200) => {
  global.fetch = (jest as any).fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
    })
  ) as any;
};

// Mock fetch with error
export const mockFetchError = (error: string, status: number = 500) => {
  global.fetch = (jest as any).fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ 
        success: false,
        error: { message: error } 
      }),
    })
  ) as any;
};

// Mock fetch with network error
export const mockFetchNetworkError = () => {
  global.fetch = (jest as any).fn(() =>
    Promise.reject(new Error('Network error'))
  ) as any;
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render, createTestQueryClient };
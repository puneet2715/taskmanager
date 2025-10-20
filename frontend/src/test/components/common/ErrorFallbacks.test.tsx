import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  GenericErrorFallback,
  NetworkErrorFallback,
  AuthErrorFallback,
  ServerErrorFallback,
  LoadingErrorFallback,
  CompactErrorFallback,
} from '@/components/common/ErrorFallbacks';

describe('ErrorFallbacks', () => {
  describe('GenericErrorFallback', () => {
    it('renders with default props', () => {
      render(<GenericErrorFallback />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    });

    it('renders with custom title and message', () => {
      render(
        <GenericErrorFallback 
          title="Custom Error" 
          message="Custom error message" 
        />
      );
      
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      render(<GenericErrorFallback onRetry={onRetry} />);
      
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalled();
    });

    it('shows retrying state', () => {
      render(<GenericErrorFallback onRetry={jest.fn()} isRetrying={true} />);
      
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
    });

    it('calls onGoHome when go home button is clicked', () => {
      const onGoHome = jest.fn();
      render(<GenericErrorFallback onGoHome={onGoHome} />);
      
      fireEvent.click(screen.getByRole('button', { name: /go home/i }));
      expect(onGoHome).toHaveBeenCalled();
    });
  });

  describe('NetworkErrorFallback', () => {
    it('renders network error UI', () => {
      render(<NetworkErrorFallback />);
      
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('calls window.location.reload when reload button is clicked', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(<NetworkErrorFallback />);
      
      fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('AuthErrorFallback', () => {
    it('renders authentication error UI', () => {
      render(<AuthErrorFallback />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/session has expired/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('navigates to sign in page when sign in button is clicked', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(<AuthErrorFallback />);
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(mockLocation.href).toBe('/auth/signin');
    });
  });

  describe('ServerErrorFallback', () => {
    it('renders server error UI', () => {
      render(<ServerErrorFallback />);
      
      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/server is currently experiencing issues/)).toBeInTheDocument();
    });

    it('navigates to home when go home button is clicked', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(<ServerErrorFallback />);
      
      fireEvent.click(screen.getByRole('button', { name: /go home/i }));
      expect(mockLocation.href).toBe('/');
    });
  });

  describe('LoadingErrorFallback', () => {
    it('renders with default resource name', () => {
      render(<LoadingErrorFallback />);
      
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText(/We couldn't load the data/)).toBeInTheDocument();
    });

    it('renders with custom resource name', () => {
      render(<LoadingErrorFallback resourceName="projects" />);
      
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      expect(screen.getByText(/We couldn't load the projects/)).toBeInTheDocument();
    });

    it('shows loading state when retrying', () => {
      render(<LoadingErrorFallback onRetry={jest.fn()} isRetrying={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('CompactErrorFallback', () => {
    it('renders compact error UI', () => {
      render(<CompactErrorFallback />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<CompactErrorFallback message="Custom compact error" />);
      
      expect(screen.getByText('Custom compact error')).toBeInTheDocument();
    });

    it('shows retry button when onRetry is provided', () => {
      const onRetry = jest.fn();
      render(<CompactErrorFallback onRetry={onRetry} />);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('shows retrying state', () => {
      render(<CompactErrorFallback onRetry={jest.fn()} isRetrying={true} />);
      
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
    });
  });
});
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Determine error type and show appropriate toast
    if (this.isNetworkError(error)) {
      toast.error('Network error. Please check your connection.');
    } else if (this.isAuthError(error)) {
      toast.error('Authentication error. Please sign in again.');
    } else {
      toast.error('Something went wrong. Please try again.');
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isNetworkError(error: Error): boolean {
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('Failed to fetch') ||
           error.name === 'NetworkError';
  }

  private isAuthError(error: Error): boolean {
    return error.message.includes('401') ||
           error.message.includes('403') ||
           error.message.includes('Unauthorized') ||
           error.message.includes('Authentication');
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    try {
      // Call custom retry handler if provided
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      // Reset error state after a short delay
      this.retryTimeoutId = setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRetrying: false,
        });
      }, 500);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ isRetrying: false });
      toast.error('Retry failed. Please try again.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error && this.isNetworkError(this.state.error);
      const isAuthError = this.state.error && this.isAuthError(this.state.error);

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              {isNetworkError ? (
                <WifiOff className="w-6 h-6 text-red-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isNetworkError ? 'Connection Problem' : 
             isAuthError ? 'Authentication Error' : 
             'Something went wrong'}
          </h3>
          
          <p className="text-gray-600 mb-4 max-w-sm">
            {isNetworkError ? 'Please check your internet connection and try again.' :
             isAuthError ? 'Your session may have expired. Please sign in again.' :
             'We encountered an unexpected error. Please try again.'}
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
              <span>{this.state.isRetrying ? 'Retrying...' : 'Try again'}</span>
            </button>
            
            {isNetworkError && (
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <Wifi className="w-4 h-4" />
                <span>Reload page</span>
              </button>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left w-full max-w-md">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error details (development only)
              </summary>
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                <div className="font-semibold mb-2">Error:</div>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
                
                {this.state.error.stack && (
                  <>
                    <div className="font-semibold mt-4 mb-2">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;
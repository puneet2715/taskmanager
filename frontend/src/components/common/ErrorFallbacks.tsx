'use client';

import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Wifi, 
  WifiOff, 
  Lock, 
  Server,
  AlertCircle 
} from 'lucide-react';

interface BaseErrorFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  isRetrying?: boolean;
}

// Generic error fallback
export const GenericErrorFallback: React.FC<BaseErrorFallbackProps & { 
  title?: string; 
  message?: string; 
}> = ({ 
  title = "Something went wrong", 
  message = "We encountered an unexpected error. Please try again.",
  onRetry,
  onGoHome,
  isRetrying = false 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="p-3 bg-red-100 rounded-full mb-4">
      <AlertTriangle className="w-8 h-8 text-red-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-600 mb-6 max-w-md">{message}</p>
    <div className="flex space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Try again'}</span>
        </button>
      )}
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Go home</span>
        </button>
      )}
    </div>
  </div>
);

// Network error fallback
export const NetworkErrorFallback: React.FC<BaseErrorFallbackProps> = ({ 
  onRetry, 
  isRetrying = false 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="p-3 bg-red-100 rounded-full mb-4">
      <WifiOff className="w-8 h-8 text-red-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Problem</h2>
    <p className="text-gray-600 mb-6 max-w-md">
      Unable to connect to the server. Please check your internet connection and try again.
    </p>
    <div className="flex space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Try again'}</span>
        </button>
      )}
      <button
        onClick={() => window.location.reload()}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
      >
        <Wifi className="w-4 h-4" />
        <span>Reload page</span>
      </button>
    </div>
  </div>
);

// Authentication error fallback
export const AuthErrorFallback: React.FC<BaseErrorFallbackProps> = ({ 
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="p-3 bg-yellow-100 rounded-full mb-4">
      <Lock className="w-8 h-8 text-yellow-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
    <p className="text-gray-600 mb-6 max-w-md">
      Your session has expired or you don't have permission to access this resource.
    </p>
    <div className="flex space-x-3">
      <button
        onClick={() => window.location.href = '/auth/signin'}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
      >
        <Lock className="w-4 h-4" />
        <span>Sign in</span>
      </button>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try again</span>
        </button>
      )}
    </div>
  </div>
);

// Server error fallback
export const ServerErrorFallback: React.FC<BaseErrorFallbackProps> = ({ 
  onRetry, 
  isRetrying = false 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="p-3 bg-red-100 rounded-full mb-4">
      <Server className="w-8 h-8 text-red-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Server Error</h2>
    <p className="text-gray-600 mb-6 max-w-md">
      The server is currently experiencing issues. Please try again in a few moments.
    </p>
    <div className="flex space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Try again'}</span>
        </button>
      )}
      <button
        onClick={() => window.location.href = '/'}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
      >
        <Home className="w-4 h-4" />
        <span>Go home</span>
      </button>
    </div>
  </div>
);

// Loading error fallback (for when data fails to load)
export const LoadingErrorFallback: React.FC<BaseErrorFallbackProps & { 
  resourceName?: string; 
}> = ({ 
  resourceName = "data", 
  onRetry, 
  isRetrying = false 
}) => (
  <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
    <div className="p-2 bg-red-100 rounded-full mb-3">
      <AlertCircle className="w-6 h-6 text-red-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load {resourceName}</h3>
    <p className="text-gray-600 mb-4 text-sm">
      We couldn't load the {resourceName}. Please try again.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Loading...' : 'Try again'}</span>
      </button>
    )}
  </div>
);

// Compact error fallback for inline use
export const CompactErrorFallback: React.FC<BaseErrorFallbackProps & { 
  message?: string; 
}> = ({ 
  message = "Something went wrong", 
  onRetry, 
  isRetrying = false 
}) => (
  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center space-x-2">
      <AlertCircle className="w-4 h-4 text-red-600" />
      <span className="text-sm text-red-700">{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1 disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
      </button>
    )}
  </div>
);
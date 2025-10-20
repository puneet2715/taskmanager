'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSocketContext } from '@/components/providers/SocketProvider';
import toast from 'react-hot-toast';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { isConnected, connectedUsers } = useSocketContext();
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastConnectedTime, setLastConnectedTime] = useState<Date | null>(null);

  useEffect(() => {
    if (isConnected) {
      setConnectionState('connected');
      setLastConnectedTime(new Date());
    } else {
      setConnectionState('disconnected');
    }
  }, [isConnected]);

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'connecting':
        return <Loader className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm font-medium ${connectionState === 'connected' ? 'text-green-600' : connectionState === 'connecting' ? 'text-yellow-600' : 'text-red-600'}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  // Detailed status card
  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{getStatusText()}</span>
        </div>
        {connectionState === 'connected' && connectedUsers.size > 0 && (
          <span className="text-xs bg-white px-2 py-1 rounded-full">
            {connectedUsers.size} online
          </span>
        )}
      </div>
      
      {connectionState === 'connected' && lastConnectedTime && (
        <p className="text-xs opacity-75">
          Connected at {lastConnectedTime.toLocaleTimeString()}
        </p>
      )}
      
      {connectionState === 'disconnected' && (
        <p className="text-xs opacity-75">
          Real-time updates are unavailable
        </p>
      )}
      
      {connectionState === 'connecting' && (
        <p className="text-xs opacity-75">
          Establishing connection...
        </p>
      )}
    </div>
  );
};

// Hook for connection status notifications
export const useConnectionStatusNotifications = () => {
  const { isConnected } = useSocketContext();
  const [wasConnected, setWasConnected] = useState(false);

  useEffect(() => {
    if (isConnected && !wasConnected) {
      // Just connected
      toast.success('Real-time updates enabled', {
        duration: 3000,
        icon: '🟢',
      });
      setWasConnected(true);
    } else if (!isConnected && wasConnected) {
      // Just disconnected
      toast.error('Real-time updates disabled', {
        duration: 5000,
        icon: '🔴',
      });
      setWasConnected(false);
    }
  }, [isConnected, wasConnected]);
};

export default ConnectionStatus;
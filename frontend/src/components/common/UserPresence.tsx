'use client';

import React from 'react';
import { useSocketContext } from '../providers/SocketProvider';
import { UserIcon, WifiIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface UserPresenceProps {
  className?: string;
}

export const UserPresence: React.FC<UserPresenceProps> = ({ className = '' }) => {
  const { isConnected, connectedUsers } = useSocketContext();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <WifiIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Connected</span>
          </>
        ) : (
          <>
            <XCircleIcon className="h-4 w-4 text-red-500" />
            <WifiIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">Disconnected</span>
          </>
        )}
      </div>

      {/* Active Users Count */}
      {isConnected && connectedUsers.size > 0 && (
        <div className="flex items-center space-x-1 border-l border-gray-300 pl-2">
          <UserIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-gray-600">
            {connectedUsers.size} active user{connectedUsers.size !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

interface UserPresenceIndicatorProps {
  userId: string;
  className?: string;
}

export const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  userId,
  className = '',
}) => {
  const { connectedUsers } = useSocketContext();
  const isOnline = connectedUsers.has(userId);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`h-3 w-3 rounded-full border-2 border-white ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
        title={isOnline ? 'Online' : 'Offline'}
      />
      {isOnline && (
        <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-green-500 opacity-75" />
      )}
    </div>
  );
};

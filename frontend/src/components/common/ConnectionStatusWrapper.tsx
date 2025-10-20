'use client';

import React from 'react';
import { useSocketContext } from '@/components/providers/SocketProvider';
import ConnectionStatus, { useConnectionStatusNotifications } from '@/components/common/ConnectionStatus';

interface ConnectionStatusWrapperProps {
  className?: string;
}

const ConnectionStatusWrapper: React.FC<ConnectionStatusWrapperProps> = ({ className }) => {
  // try {
    // This will throw if not within SocketProvider
    useSocketContext();
    
    // Enable connection status notifications
    useConnectionStatusNotifications();
    
    return <ConnectionStatus className={className} />;
  // } catch (error) {
  //   // Not within SocketProvider, don't render anything
  //   return null;
  // }
};

export default ConnectionStatusWrapper;
'use client';

import React, { ReactNode } from 'react';
import { useSocketQueryIntegration } from '../../hooks/useSocketQueryIntegration';

interface SocketQueryProviderProps {
  children: ReactNode;
}

export const SocketQueryProvider: React.FC<SocketQueryProviderProps> = ({ children }) => {
  // Initialize the socket-query integration
  useSocketQueryIntegration();

  return <>{children}</>;
};
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface ServerToClientEvents {
  taskUpdated: (task: unknown) => void;
  taskMoved: (taskId: string, newStatus: string, newPosition: number) => void;
  taskCreated: (task: unknown) => void;
  taskDeleted: (taskId: string, projectId: string) => void;
  projectUpdated: (project: unknown) => void;
  userJoined: (user: unknown, projectId: string) => void;
  userLeft: (userId: string, projectId: string) => void;
  memberRemoved: (removedUserIds: string[], projectId: string) => void;
  error: (message: string) => void;
  presenceSync: (data: { projectId: string; activeUsers: string[]; timestamp: string }) => void;
}

interface ClientToServerEvents {
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  updateTask: (taskId: string, updates: unknown) => void;
  moveTask: (taskId: string, newStatus: string, newPosition: number) => void;
}

export interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  updateTask: (taskId: string, updates: unknown) => void;
  moveTask: (taskId: string, newStatus: string, newPosition: number) => void;
  connectedUsers: Set<string>;
}

interface UserPresenceState {
  connectedUsers: Set<string>;
  lastSyncTimestamp: number;
  syncInProgress: boolean;
  pendingUpdates: Map<string, 'join' | 'leave'>;
  // Added for task 4: Enhanced state management
  lastUserActivity: Map<string, number>;
  reconnectAttemptTimestamp: number | null;
  syncErrors: number;
}

interface UserPresenceSync {
  projectId: string;
  activeUsers: string[];
  timestamp: string;
}

export const useSocket = (): SocketContextType => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Enhanced user presence state management
  const [userPresenceState, setUserPresenceState] = useState<UserPresenceState>({
    connectedUsers: new Set(),
    lastSyncTimestamp: 0,
    syncInProgress: false,
    pendingUpdates: new Map(),
    // Added for task 4: Enhanced state management
    lastUserActivity: new Map(),
    reconnectAttemptTimestamp: null,
    syncErrors: 0,
  });
  
  const currentProjectIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);
  const lastConnectAttemptRef = useRef<number>(0);
  
  // Configuration for periodic sync
  // const SYNC_INTERVAL = 60000; // Increased from 30s to 60s to reduce frequency
  // const SYNC_TIMEOUT = 5000; // 5 seconds timeout for sync requests
  // const MAX_PENDING_UPDATES = 10; // Maximum pending updates before forcing sync
  // const USER_ACTIVITY_TIMEOUT = 300000; // 5 minutes of inactivity before considering a user potentially stale
  // const MAX_SYNC_ERRORS = 3; // Maximum consecutive sync errors before forcing reconnection
  // const USER_PRESENCE_COOLDOWN = 2000; // 2 seconds cooldown between duplicate presence updates

  // Task 5: Improved validation and recovery mechanism
  const validateUserPresence = useCallback(() => {
    // Commented out due to synchronization issues
    /*
    const now = Date.now();
    let staleUsersFound = false;
    
    // Check for stale users (inactive for more than 5 minutes)
    setUserPresenceState(prev => {
      const newConnectedUsers = new Set(prev.connectedUsers);
      const newLastUserActivity = new Map(prev.lastUserActivity);
      
      for (const [userId, lastActivity] of prev.lastUserActivity.entries()) {
        if (now - lastActivity > USER_ACTIVITY_TIMEOUT) {
          console.log(`Removing stale user ${userId} due to inactivity`);
          newConnectedUsers.delete(userId);
          newLastUserActivity.delete(userId);
          staleUsersFound = true;
        }
      }
      
      if (staleUsersFound) {
        return {
          ...prev,
          connectedUsers: newConnectedUsers,
          lastUserActivity: newLastUserActivity,
        };
      }
      
      return prev;
    });
    
    // If stale users were found, force a sync to reconcile with backend
    if (staleUsersFound && currentProjectIdRef.current) {
      console.log('Stale users detected, forcing sync with backend');
      syncWithBackend(currentProjectIdRef.current);
    }
    
    return staleUsersFound;
    */
    return false; // Return false to indicate no stale users found
  }, []);

  // Periodic synchronization with backend
  const syncWithBackend = useCallback(async (projectId: string): Promise<void> => {
    // Commented out due to synchronization issues
    /*
    if (!session?.accessToken || !projectId) {
      return;
    }

    // Prevent multiple simultaneous sync operations
    if (userPresenceState.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    try {
      setUserPresenceState(prev => ({ ...prev, syncInProgress: true }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/presence/projects/${projectId}/count`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const backendUsers = new Set<string>(data.data.activeUsers);
        const currentUsers = userPresenceState.connectedUsers;
        
        // Detect state drift
        const hasStateDrift = backendUsers.size !== currentUsers.size || 
          !Array.from(backendUsers).every(user => currentUsers.has(user)) ||
          !Array.from(currentUsers).every(user => backendUsers.has(user));

        if (hasStateDrift) {
          console.log('State drift detected, correcting frontend state');
          console.log('Backend users:', Array.from(backendUsers));
          console.log('Frontend users:', Array.from(currentUsers));
          
          // Task 4: Enhanced state management - preserve activity timestamps for existing users
          setUserPresenceState(prev => {
            const newLastUserActivity = new Map(prev.lastUserActivity);
            
            // Remove activity data for users no longer present
            for (const userId of newLastUserActivity.keys()) {
              if (!backendUsers.has(userId)) {
                newLastUserActivity.delete(userId);
              }
            }
            
            // Add current timestamp for new users
            for (const userId of backendUsers) {
              if (!newLastUserActivity.has(userId)) {
                newLastUserActivity.set(userId, Date.now());
              }
            }
            
            return {
              ...prev,
              connectedUsers: backendUsers,
              lastSyncTimestamp: Date.now(),
              syncInProgress: false,
              pendingUpdates: new Map(), // Clear pending updates after sync
              lastUserActivity: newLastUserActivity,
              syncErrors: 0, // Reset error count on successful sync
            };
          });
          
          toast.success('User presence synchronized');
        } else {
          setUserPresenceState(prev => ({
            ...prev,
            lastSyncTimestamp: Date.now(),
            syncInProgress: false,
            pendingUpdates: new Map(), // Clear pending updates after successful sync
            syncErrors: 0, // Reset error count on successful sync
          }));
        }
      }
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      
      // Task 5: Track consecutive sync errors
      setUserPresenceState(prev => {
        const newSyncErrors = prev.syncErrors + 1;
        console.warn(`Sync error ${newSyncErrors}/${MAX_SYNC_ERRORS}`);
        
        // If we've reached max errors, trigger reconnection
        if (newSyncErrors >= MAX_SYNC_ERRORS && socketRef.current) {
          console.warn('Too many sync errors, forcing socket reconnection');
          socketRef.current.disconnect();
          // Reconnection will be handled by the disconnect handler
        }
        
        return { 
          ...prev, 
          syncInProgress: false,
          syncErrors: newSyncErrors 
        };
      });
      
      // Don't show error toast for aborted requests (timeout)
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('User presence sync failed, will retry on next interval');
      }
    }
    */
    console.log('User synchronization disabled');
  }, []);

  // Task 6: Enhanced user presence update with deduplication and cooldown
  const updateUserPresence = useCallback((userId: string, action: 'join' | 'leave', projectId: string) => {
    if (currentProjectIdRef.current !== projectId) {
      console.log(`Ignoring ${action} event for different project`);
      return;
    }
  
    // Simplified version without cooldown and activity tracking
    setUserPresenceState(prev => {
      const newConnectedUsers = new Set(prev.connectedUsers);
      
      if (action === 'join') {
        newConnectedUsers.add(userId);
        console.log(`User ${userId} added to connected users`);
      } else if (action === 'leave') {
        newConnectedUsers.delete(userId);
        console.log(`User ${userId} removed from connected users`);
      }
      
      console.log(`User presence updated: ${action} ${userId}`);
      console.log('Connected users after update:', Array.from(newConnectedUsers));
      
      return {
        ...prev,
        connectedUsers: newConnectedUsers,
      };
    });
  }, []);

  // Start periodic synchronization and validation
  useEffect(() => {
    // Commented out due to synchronization issues
    /*
    if (!currentProjectIdRef.current || !isConnected) {
      return;
    }

    // Task 5: Add periodic validation
    const startPeriodicOperations = () => {
      // Sync with backend less frequently (every 60s instead of 30s)
      const syncIntervalId = setInterval(() => {
        if (currentProjectIdRef.current && isConnected) {
          syncWithBackend(currentProjectIdRef.current);
        }
      }, SYNC_INTERVAL);
      
      // Validate user presence more frequently (every 20s)
      const validationIntervalId = setInterval(() => {
        if (currentProjectIdRef.current && isConnected) {
          validateUserPresence();
        }
      }, 20000);

      return { syncIntervalId, validationIntervalId };
    };

    const { syncIntervalId, validationIntervalId } = startPeriodicOperations();

    return () => {
      clearInterval(syncIntervalId);
      clearInterval(validationIntervalId);
    };
    */
  }, [isConnected, syncWithBackend, validateUserPresence]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const connectSocket = () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current) {
        console.log('Connection attempt already in progress, skipping...');
        return;
      }

      // Throttle connection attempts (minimum 1 second between attempts)
      const now = Date.now();
      if (now - lastConnectAttemptRef.current < 1000) {
        console.log('Connection attempt throttled, waiting...');
        setTimeout(connectSocket, 1000 - (now - lastConnectAttemptRef.current));
        return;
      }

      lastConnectAttemptRef.current = now;
      isConnectingRef.current = true;

      // Clean up existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.taskmanager.shadowdragon.dev';
      console.log('Attempting to connect to socket server:', socketUrl);
      console.log('Using access token:', session.accessToken ? 'Token present' : 'No token');
      
      const socket = io(socketUrl, {
        auth: {
          token: session.accessToken,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        console.log('Socket connected:', socket.id);
        toast.success('Connected to real-time updates');
      });

      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        setUserPresenceState({
          connectedUsers: new Set(),
          lastSyncTimestamp: 0,
          syncInProgress: false,
          pendingUpdates: new Map(),
          lastUserActivity: new Map(),
          reconnectAttemptTimestamp: null,
          syncErrors: 0,
        });
        isConnectingRef.current = false;
        console.log('Socket disconnected:', reason);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          toast.error('Disconnected from server');
        } else {
          // Client-side disconnect, attempt to reconnect
          toast.error('Connection lost, attempting to reconnect...');
          attemptReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: (error as any).description,
          context: (error as any).context,
          type: (error as any).type
        });
        setIsConnected(false);
        isConnectingRef.current = false;
        
        if (error.message.includes('Authentication') || error.message.includes('Authentication failed')) {
          toast.error('Authentication failed. Please refresh the page.');
        } else if (error.message.includes('xhr poll error') || error.message.includes('websocket error')) {
          toast.error('Network connection failed. Check your internet connection.');
          attemptReconnect();
        } else {
          toast.error(`Connection failed: ${error.message}`);
          attemptReconnect();
        }
      });

      // Real-time event handlers
      socket.on('taskUpdated', (task) => {
        console.log('Task updated:', task);
        // This will be handled by React Query cache invalidation
      });

      socket.on('taskMoved', (taskId, newStatus, newPosition) => {
        console.log('Task moved:', { taskId, newStatus, newPosition });
        // This will be handled by React Query cache invalidation
      });

      socket.on('taskCreated', (task) => {
        console.log('Task created:', task);
        // This will be handled by React Query cache invalidation
      });

      socket.on('taskDeleted', (taskId, projectId) => {
        console.log('Task deleted:', { taskId, projectId });
        // This will be handled by React Query cache invalidation
      });

      socket.on('projectUpdated', (project) => {
        console.log('Project updated:', project);
        // This will be handled by React Query cache invalidation
      });

      socket.on('userJoined', (user, projectId) => {
        console.log('User joined project:', { user, projectId });
        console.log('Current project ID:', currentProjectIdRef.current);
        
        updateUserPresence(user.id, 'join', projectId);
        
        // Show toast notification only for current project
        if (currentProjectIdRef.current === projectId) {
          toast.success(`${user.email} joined the project`);
        }
      });

      socket.on('userLeft', (userId, projectId) => {
        console.log('User left project:', { userId, projectId });
        console.log('Current project ID:', currentProjectIdRef.current);
        
        updateUserPresence(userId, 'leave', projectId);
      });

      socket.on('presenceSync', ({ projectId, activeUsers }) => {
        console.log('Presence sync for project:', projectId, activeUsers);
        if (currentProjectIdRef.current !== projectId) {
          return;
        }
        setUserPresenceState(prev => ({
          ...prev,
          connectedUsers: new Set(activeUsers),
        }));
      });

      socket.on('error', (message) => {
        console.error('Socket error:', message);
        toast.error(`Socket error: ${message}`);
      });
    };

    const attemptReconnect = () => {
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Failed to reconnect after multiple attempts');
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        connectSocket();
      }, delay);
    };

    connectSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
      setUserPresenceState({
        connectedUsers: new Set(),
        lastSyncTimestamp: 0,
        syncInProgress: false,
        pendingUpdates: new Map(),
        lastUserActivity: new Map(),
        reconnectAttemptTimestamp: null,
        syncErrors: 0,
      });
    };
  }, [session?.accessToken, updateUserPresence, session?.user]); // Use accessToken to handle token refresh properly

  // Handle token refresh without reconnecting
  useEffect(() => {
    if (socketRef.current && session?.accessToken && isConnected) {
      // Update the socket's auth token if it has changed
      // Note: Socket.io doesn't have a built-in way to update auth after connection
      // The token will be used for the next reconnection if needed
      console.log('Session token updated, socket remains connected');
    }
  }, [session?.accessToken, isConnected]);

  // Socket action methods - memoized to prevent unnecessary re-renders
  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current && isConnected && session?.user) {
      // If switching to a different project, clear state first
      if (currentProjectIdRef.current && currentProjectIdRef.current !== projectId) {
        console.log('Switching from project', currentProjectIdRef.current, 'to', projectId);
        setUserPresenceState({
          connectedUsers: new Set(),
          lastSyncTimestamp: 0,
          syncInProgress: false,
          pendingUpdates: new Map(),
          lastUserActivity: new Map(),
          reconnectAttemptTimestamp: null,
          syncErrors: 0,
        });
      }
      
      // In the joinProject function, comment out the sync call:
      socketRef.current.emit('joinProject', projectId);
      console.log('Joined project:', projectId);
      currentProjectIdRef.current = projectId;
      
      // Add current user to connected users set since backend doesn't emit userJoined to self
      const currentUserId = session.user.id;
      if (currentUserId) {
        setUserPresenceState(prev => {
          const newConnectedUsers = new Set([...prev.connectedUsers, currentUserId]);
          console.log('Added current user to connected users for project:', projectId);
          console.log('Connected users after join:', Array.from(newConnectedUsers));
          return {
            ...prev,
            connectedUsers: newConnectedUsers,
          };
        });
      }
      
      // Commented out due to synchronization issues
      // setTimeout(() => syncWithBackend(projectId), 1000);
    }
  }, [isConnected, session?.user]);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current && isConnected && session?.user) {
      socketRef.current.emit('leaveProject', projectId);
      console.log('Left project:', projectId);
      
      // Clear all state when leaving a project
      setUserPresenceState({
        connectedUsers: new Set(),
        lastSyncTimestamp: 0,
        syncInProgress: false,
        pendingUpdates: new Map(),
        lastUserActivity: new Map(),
        reconnectAttemptTimestamp: null,
        syncErrors: 0,
      });
      currentProjectIdRef.current = null;
      console.log('Cleared all user presence state when leaving project:', projectId);
    }
  }, [isConnected, session?.user]);

  const updateTask = useCallback((taskId: string, updates: unknown) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('updateTask', taskId, updates);
      console.log('Task update emitted:', { taskId, updates });
    }
  }, [isConnected]);

  const moveTask = useCallback((taskId: string, newStatus: string, newPosition: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('moveTask', taskId, newStatus, newPosition);
      console.log('Task move emitted:', { taskId, newStatus, newPosition });
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    joinProject,
    leaveProject,
    updateTask,
    moveTask,
    connectedUsers: userPresenceState.connectedUsers,
  };
};
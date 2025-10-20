# Design Document

## Overview

The active user count issue stems from race conditions and state synchronization problems between the frontend and backend socket implementations. The current system has several flaws:

1. **Frontend state management**: The `connectedUsers` Set in `useSocket` hook doesn't properly handle rapid connect/disconnect scenarios
2. **Backend user tracking**: The socket server's user tracking logic has edge cases with multiple connections per user
3. **State synchronization**: No mechanism to sync frontend state with backend ground truth
4. **Event handling**: Missing proper cleanup and deduplication of user presence events

This design addresses these issues by implementing a more robust user presence system with proper state management, event deduplication, and periodic synchronization.

## Architecture

### Backend Changes

#### Enhanced Socket Server User Tracking
- Implement more robust user tracking with connection counting per user per project
- Add periodic cleanup of stale connections
- Implement user presence state synchronization endpoint
- Add proper event deduplication logic

#### User Presence Service
- Create a dedicated service for managing user presence state
- Implement methods for getting accurate user counts
- Add cleanup mechanisms for orphaned user records

### Frontend Changes

#### Enhanced useSocket Hook
- Implement proper state synchronization with backend
- Add periodic user count validation
- Improve event handling with deduplication
- Add recovery mechanisms for state drift

#### User Presence State Management
- Implement more robust connected users state management
- Add validation and correction mechanisms
- Implement proper cleanup on component unmount

## Components and Interfaces

### Backend Interfaces

```typescript
interface UserPresenceState {
  userId: string;
  email: string;
  projectId: string;
  connectionCount: number;
  lastSeen: Date;
}

interface ProjectPresence {
  projectId: string;
  users: Map<string, UserPresenceState>;
  totalActiveUsers: number;
}
```

### Frontend Interfaces

```typescript
interface UserPresenceSync {
  projectId: string;
  activeUsers: string[];
  timestamp: number;
}

interface SocketState {
  connectedUsers: Set<string>;
  lastSync: number;
  syncInProgress: boolean;
}
```

## Data Models

### Backend User Presence Tracking

The backend will maintain a more sophisticated tracking system:

```typescript
// Per-project user tracking with connection counting
private projectUsers: Map<string, Map<string, {
  userId: string;
  email: string;
  connectionCount: number;
  lastActivity: Date;
}>> = new Map();

// Socket ID to user/project mapping for cleanup
private socketMappings: Map<string, {
  userId: string;
  projectId: string;
}> = new Map();
```

### Frontend State Management

The frontend will implement a more robust state management approach:

```typescript
interface UserPresenceState {
  connectedUsers: Set<string>;
  lastSyncTimestamp: number;
  syncInProgress: boolean;
  pendingUpdates: Map<string, 'join' | 'leave'>;
}
```

## Error Handling

### Backend Error Handling

1. **Connection Cleanup**: Implement proper cleanup when sockets disconnect unexpectedly
2. **State Validation**: Add periodic validation of user presence state
3. **Event Deduplication**: Prevent duplicate user join/leave events
4. **Recovery Mechanisms**: Implement recovery for corrupted state

### Frontend Error Handling

1. **State Drift Detection**: Detect when frontend state drifts from backend
2. **Automatic Correction**: Implement automatic state correction mechanisms
3. **Fallback Behavior**: Graceful degradation when presence data is unavailable
4. **Retry Logic**: Implement retry logic for failed synchronization attempts

## Testing Strategy

### Unit Tests

#### Backend Tests
- Test user presence tracking with multiple connections per user
- Test proper cleanup on disconnect
- Test event deduplication logic
- Test state synchronization endpoints

#### Frontend Tests
- Test useSocket hook state management
- Test user presence component updates
- Test error handling and recovery
- Test state synchronization logic

### Integration Tests

1. **Multi-User Scenarios**: Test with multiple users joining/leaving projects
2. **Rapid Connect/Disconnect**: Test the specific scenario that caused the original issue
3. **Network Interruption**: Test behavior during network issues and recovery
4. **State Synchronization**: Test periodic sync between frontend and backend

### End-to-End Tests

1. **User Journey Tests**: Test complete user flows with presence tracking
2. **Cross-Browser Tests**: Ensure consistent behavior across different browsers
3. **Performance Tests**: Ensure presence tracking doesn't impact performance
4. **Stress Tests**: Test with high numbers of concurrent users

## Implementation Approach

### Phase 1: Backend Improvements
1. Enhance socket server user tracking logic
2. Implement user presence service
3. Add state synchronization endpoints
4. Implement proper cleanup mechanisms

### Phase 2: Frontend Improvements
1. Enhance useSocket hook with better state management
2. Implement periodic synchronization
3. Add error handling and recovery
4. Update UserPresence component

### Phase 3: Testing and Validation
1. Implement comprehensive test suite
2. Perform integration testing
3. Validate fix with original rapid connect/disconnect scenario
4. Performance testing and optimization

## Key Design Decisions

### Connection Counting vs. Boolean Tracking
**Decision**: Use connection counting per user per project instead of simple boolean tracking.
**Rationale**: Users can have multiple browser tabs/connections, and we need to track when the last connection for a user disconnects.

### Periodic Synchronization
**Decision**: Implement periodic synchronization between frontend and backend state.
**Rationale**: Provides a recovery mechanism for state drift and ensures eventual consistency.

### Event Deduplication
**Decision**: Implement event deduplication on both frontend and backend.
**Rationale**: Prevents duplicate events from causing incorrect state updates during rapid connect/disconnect scenarios.

### Graceful Degradation
**Decision**: Implement fallback behavior when presence data is unavailable.
**Rationale**: Ensures the application remains functional even when presence tracking has issues.
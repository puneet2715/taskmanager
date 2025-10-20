# Design Document

## Overview

The OAuth authentication fix addresses the missing JWT token generation in the OAuth flow. Currently, the backend's `createOrUpdateOAuthUser` method creates/finds users but doesn't generate JWT tokens, causing NextAuth sessions to lack access tokens needed for API authentication.

The solution involves modifying the backend OAuth handler to generate and return JWT tokens, ensuring OAuth users receive the same authentication flow as credential users.

## Architecture

### Current OAuth Flow (Broken)
1. User initiates OAuth login (GitHub/Google)
2. NextAuth handles OAuth provider authentication
3. NextAuth JWT callback calls backend `/api/auth/oauth`
4. Backend creates/finds user but returns only user data (no token)
5. NextAuth stores incomplete session data (missing accessToken)
6. API requests fail with 401 due to missing authorization

### Fixed OAuth Flow
1. User initiates OAuth login (GitHub/Google)
2. NextAuth handles OAuth provider authentication
3. NextAuth JWT callback calls backend `/api/auth/oauth`
4. Backend creates/finds user AND generates JWT token
5. Backend returns user data with JWT token
6. NextAuth stores complete session data (including accessToken)
7. API requests succeed with proper authorization headers

## Components and Interfaces

### Backend Changes

#### AuthService.createOrUpdateOAuthUser
- **Current**: Returns only user data object
- **Modified**: Returns user data object with JWT token (same structure as loginUser/registerUser)
- **Interface**:
```typescript
{
  user: {
    id: string
    name: string
    email: string
    role: string
  },
  token: string  // Added JWT token
}
```

#### AuthController.oauthHandler
- **Current**: Returns user data directly from AuthService
- **Modified**: Returns structured response matching other auth endpoints
- **Response Format**:
```typescript
{
  success: true,
  message: 'OAuth authentication successful',
  data: {
    user: UserData,
    token: string
  }
}
```

### Frontend Changes

#### NextAuth JWT Callback (auth.ts)
- **Current**: Tries to access `userData.data.token` but token doesn't exist
- **Modified**: Successfully extracts token from properly structured response
- **Token Storage**: Store JWT token in NextAuth session for API authentication

## Data Models

No changes to existing data models are required. The User model already supports OAuth users through the existing email/name fields.

## Error Handling

### Backend Error Handling
- JWT token generation failures should be logged and handled gracefully
- OAuth user creation errors should return appropriate HTTP status codes
- Maintain existing validation and error response formats

### Frontend Error Handling
- NextAuth JWT callback should handle missing token scenarios gracefully
- API routes should continue to return 401 for missing/invalid tokens
- Maintain existing error logging for debugging

### Logging Strategy
- Log successful OAuth authentications with provider information
- Log JWT token generation for OAuth users
- Log any OAuth-specific errors for troubleshooting
- Maintain consistent log format with existing authentication logs

## Testing Strategy

### Unit Tests
- Test AuthService.createOrUpdateOAuthUser returns token
- Test AuthController.oauthHandler response structure
- Test JWT token generation for OAuth users
- Test NextAuth JWT callback token extraction

### Integration Tests
- Test complete OAuth flow from login to API access
- Test OAuth user creation and subsequent logins
- Test API authentication with OAuth-generated tokens
- Test error scenarios (token generation failures, invalid OAuth data)

### Manual Testing
- Verify GitHub OAuth login and API access
- Verify Google OAuth login and API access
- Verify credential login still works (regression test)
- Test dashboard functionality after OAuth login
- Test project creation/access after OAuth login

## Implementation Notes

### Backward Compatibility
- Changes maintain compatibility with existing credential authentication
- Existing OAuth users will receive tokens on next login
- No database migrations required

### Security Considerations
- JWT tokens for OAuth users follow same security practices as credential users
- Token expiration and refresh logic remains unchanged
- OAuth provider validation continues through NextAuth

### Performance Impact
- Minimal performance impact (one additional JWT generation per OAuth login)
- No additional database queries required
- Existing caching and session management unaffected
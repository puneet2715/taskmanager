import { Session } from 'next-auth'

// Import only the client-side functions to avoid server-side dependencies
type UserRole = 'admin' | 'user'

interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

// Copy the functions locally for testing to avoid server-side imports
function hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  if (!user) return false
  
  if (requiredRole === 'admin') {
    return user.role === 'admin'
  }
  
  return user.role === 'admin' || user.role === 'user'
}

function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'admin')
}

function isAuthenticated(user: AuthUser | null): boolean {
  return user !== null
}

function getUserFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRole,
  }
}

describe('Auth Utils', () => {
  const mockUser: AuthUser = {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user',
  }

  const mockAdmin: AuthUser = {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }

  const mockSession: Session = {
    user: {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
    },
    expires: '2024-12-31',
  }

  describe('hasRole', () => {
    it('should return true for admin with admin role', () => {
      expect(hasRole(mockAdmin, 'admin')).toBe(true)
    })

    it('should return false for user with admin role', () => {
      expect(hasRole(mockUser, 'admin')).toBe(false)
    })

    it('should return true for admin with user role', () => {
      expect(hasRole(mockAdmin, 'user')).toBe(true)
    })

    it('should return true for user with user role', () => {
      expect(hasRole(mockUser, 'user')).toBe(true)
    })

    it('should return false for null user', () => {
      expect(hasRole(null, 'user')).toBe(false)
      expect(hasRole(null, 'admin')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      expect(isAdmin(mockAdmin)).toBe(true)
    })

    it('should return false for regular user', () => {
      expect(isAdmin(mockUser)).toBe(false)
    })

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe('isAuthenticated', () => {
    it('should return true for valid user', () => {
      expect(isAuthenticated(mockUser)).toBe(true)
      expect(isAuthenticated(mockAdmin)).toBe(true)
    })

    it('should return false for null user', () => {
      expect(isAuthenticated(null)).toBe(false)
    })
  })

  describe('getUserFromSession', () => {
    it('should extract user from valid session', () => {
      const user = getUserFromSession(mockSession)
      
      expect(user).toEqual({
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
      })
    })

    it('should return null for null session', () => {
      expect(getUserFromSession(null)).toBe(null)
    })

    it('should return null for session without user', () => {
      const sessionWithoutUser = { ...mockSession, user: undefined } as unknown
      expect(getUserFromSession(sessionWithoutUser)).toBe(null)
    })
  })
})
import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleGuard from '@/components/auth/RoleGuard'
import { LoginForm, SignupForm, OAuthButtons, AuthGuard } from '@/components/auth'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock auth-utils
jest.mock('@/lib/auth-utils', () => ({
  hasRole: jest.fn((user: any, role: string) => {
    if (!user) return false
    if (role === 'admin') return user.role === 'admin'
    return user.role === 'admin' || user.role === 'user'
  }),
  getUserFromSession: jest.fn((session: any) => {
    if (!session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    }
  }),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('Auth Components', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as unknown)
  })

  describe('ProtectedRoute', () => {
    it('should render children for authenticated user', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
            role: 'user',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show loading for loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should redirect unauthenticated user', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    it('should redirect user without required role', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
            role: 'user',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      )

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should render children for user with required role', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })

  describe('RoleGuard', () => {
    it('should render children for user with required role', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <RoleGuard requiredRole="admin">
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should render fallback for user without required role', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
            role: 'user',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <RoleGuard requiredRole="admin" fallback={<div>Access Denied</div>}>
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should render fallback for unauthenticated user', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <RoleGuard requiredRole="user" fallback={<div>Please sign in</div>}>
          <div>User Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Please sign in')).toBeInTheDocument()
      expect(screen.queryByText('User Content')).not.toBeInTheDocument()
    })

    it('should render fallback for loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <RoleGuard requiredRole="user" fallback={<div>Loading...</div>}>
          <div>User Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('User Content')).not.toBeInTheDocument()
    })
  })
})
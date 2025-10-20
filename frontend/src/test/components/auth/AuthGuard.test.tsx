import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AuthGuard, { withAuthGuard } from '@/components/auth/AuthGuard'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Test component for HOC testing
const TestComponent = ({ message }: { message: string }) => (
  <div>{message}</div>
)

describe('AuthGuard', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)
  })

  describe('Component version', () => {
    it('should render children for authenticated user', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show loading component for loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    })

    it('should show custom loading component', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <AuthGuard loadingComponent={<div>Custom Loading</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Custom Loading')).toBeInTheDocument()
    })

    it('should redirect unauthenticated user', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should use custom fallback URL', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <AuthGuard fallbackUrl="/custom-signin">
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(mockPush).toHaveBeenCalledWith('/custom-signin')
    })

    it('should show unauthorized component when provided', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <AuthGuard unauthorizedComponent={<div>Please sign in</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Please sign in')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should not redirect during loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('HOC version', () => {
    it('should render wrapped component for authenticated user', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      const WrappedComponent = withAuthGuard(TestComponent)
      
      render(<WrappedComponent message="Protected Content" />)

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show loading for loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      const WrappedComponent = withAuthGuard(TestComponent)
      
      render(<WrappedComponent message="Protected Content" />)

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    })

    it('should show custom loading component', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      const WrappedComponent = withAuthGuard(TestComponent, {
        loadingComponent: <div>HOC Loading</div>
      })
      
      render(<WrappedComponent message="Protected Content" />)

      expect(screen.getByText('HOC Loading')).toBeInTheDocument()
    })

    it('should redirect unauthenticated user', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      const WrappedComponent = withAuthGuard(TestComponent)
      
      render(<WrappedComponent message="Protected Content" />)

      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should use custom fallback URL in HOC', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      const WrappedComponent = withAuthGuard(TestComponent, {
        fallbackUrl: '/custom-login'
      })
      
      render(<WrappedComponent message="Protected Content" />)

      expect(mockPush).toHaveBeenCalledWith('/custom-login')
    })

    it('should show unauthorized component in HOC', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      const WrappedComponent = withAuthGuard(TestComponent, {
        unauthorizedComponent: <div>HOC Unauthorized</div>
      })
      
      render(<WrappedComponent message="Protected Content" />)

      expect(screen.getByText('HOC Unauthorized')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should pass props correctly to wrapped component', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
      })

      const WrappedComponent = withAuthGuard(TestComponent)
      
      render(<WrappedComponent message="Test Message" />)

      expect(screen.getByText('Test Message')).toBeInTheDocument()
    })
  })
})
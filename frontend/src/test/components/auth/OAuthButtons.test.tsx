import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import OAuthButtons from '@/components/auth/OAuthButtons'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
  },
}))

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockToast = toast as jest.Mocked<typeof toast>

describe('OAuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render OAuth buttons with default providers', () => {
    render(<OAuthButtons />)

    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('should render divider by default', () => {
    render(<OAuthButtons />)

    expect(screen.getByText('Or continue with')).toBeInTheDocument()
  })

  it('should not render divider when showDivider is false', () => {
    render(<OAuthButtons showDivider={false} />)

    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument()
  })

  it('should render custom divider text', () => {
    render(<OAuthButtons dividerText="Sign in with" />)

    expect(screen.getByText('Sign in with')).toBeInTheDocument()
  })

  it('should handle GitHub OAuth sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: true } as any)

    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    await user.click(githubButton)

    expect(mockSignIn).toHaveBeenCalledWith('github', {
      callbackUrl: '/dashboard',
      redirect: true,
    })
  })

  it('should handle Google OAuth sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: true } as any)

    render(<OAuthButtons />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    await user.click(googleButton)

    expect(mockSignIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/dashboard',
      redirect: true,
    })
  })

  it('should use custom callback URL', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: true } as any)

    render(<OAuthButtons callbackUrl="/custom-callback" />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    await user.click(githubButton)

    expect(mockSignIn).toHaveBeenCalledWith('github', {
      callbackUrl: '/custom-callback',
      redirect: true,
    })
  })

  it('should show loading state during OAuth sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    await user.click(githubButton)

    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(githubButton).toBeDisabled()
    
    // Google button should also be disabled during loading
    const googleButton = screen.getByRole('button', { name: /google/i })
    expect(googleButton).toBeDisabled()
  })

  it('should handle OAuth sign in error', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: 'OAuth error' } as any)

    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    await user.click(githubButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error signing in with GitHub')
    })
  })

  it('should handle OAuth sign in exception', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(<OAuthButtons />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error signing in with Google')
    })
  })

  it('should apply custom className', () => {
    render(<OAuthButtons className="custom-class" />)

    const container = screen.getByRole('button', { name: /github/i }).closest('div')?.parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should render buttons in grid layout', () => {
    render(<OAuthButtons />)

    const buttonsContainer = screen.getByRole('button', { name: /github/i }).parentElement
    expect(buttonsContainer).toHaveClass('grid', 'grid-cols-1', 'gap-3', 'sm:grid-cols-2')
  })

  it('should have proper accessibility attributes', () => {
    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    const googleButton = screen.getByRole('button', { name: /google/i })

    expect(githubButton).toHaveAttribute('type', 'button')
    expect(googleButton).toHaveAttribute('type', 'button')
  })

  it('should show correct icons for each provider', () => {
    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    const googleButton = screen.getByRole('button', { name: /google/i })

    // Check that SVG icons are present
    expect(githubButton.querySelector('svg')).toBeInTheDocument()
    expect(googleButton.querySelector('svg')).toBeInTheDocument()
  })

  it('should maintain button state correctly during multiple clicks', async () => {
    const user = userEvent.setup()
    let resolveSignIn: (value: any) => void
    mockSignIn.mockImplementation(() => new Promise(resolve => {
      resolveSignIn = resolve
    }))

    render(<OAuthButtons />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    
    // First click
    await user.click(githubButton)
    expect(githubButton).toBeDisabled()
    
    // Second click should not trigger another sign in
    await user.click(githubButton)
    expect(mockSignIn).toHaveBeenCalledTimes(1)
    
    // Resolve the promise
    resolveSignIn!({ ok: true })
    
    await waitFor(() => {
      expect(githubButton).not.toBeDisabled()
    })
  })
})
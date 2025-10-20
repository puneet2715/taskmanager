import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import SignInPage from '@/app/auth/signin/page'
import SignUpPage from '@/app/auth/signup/page'
import AuthErrorPage from '@/app/auth/error/page'
// Mock RSA for page component too
jest.mock('@/lib/rsa', () => ({
  encryptPassword: async (pwd: string) => ({ encrypted: pwd, keyId: 'plain', scheme: 'plain' })
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue('Default'),
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Authentication Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('SignInPage', () => {
    it('should render sign in form', () => {
      render(<SignInPage />)
      
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render OAuth buttons', () => {
      render(<SignInPage />)
      
      expect(screen.getByText('GitHub')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
    })

    it('should call signIn when form is submitted', async () => {
      const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
      mockSignIn.mockResolvedValue({ error: null } as unknown)

      render(<SignInPage />)
      
      const emailInput = screen.getByPlaceholderText('Email address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'test@example.com',
          password: 'password123',
          redirect: false,
        })
      })
    })

    it('should call signIn for OAuth providers', async () => {
      const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
      
      render(<SignInPage />)
      
      const githubButton = screen.getByText('GitHub').closest('button')
      fireEvent.click(githubButton!)

      expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/dashboard' })
    })
  })

  describe('SignUpPage', () => {
    it('should render sign up form', () => {
      render(<SignUpPage />)
      
      expect(screen.getByText('Create your account')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    })

    it('should validate password confirmation', async () => {
      // Mock fetch for the test
      global.fetch = jest.fn()

      render(<SignUpPage />)
      
      const nameInput = screen.getByPlaceholderText('Enter your full name')
      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(nameInput, { target: { value: 'Test User' } })
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'different' } })
      fireEvent.click(submitButton)

      // The form should not submit due to password mismatch
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('AuthErrorPage', () => {
    it('should render error message', () => {
      render(<AuthErrorPage />)
      
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText('An error occurred during authentication.')).toBeInTheDocument()
      expect(screen.getByText('Try signing in again')).toBeInTheDocument()
    })
  })
})
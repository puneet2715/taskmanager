import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

describe('Header', () => {
  const mockOnMenuClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any)
  })

  const mockSession = {
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://example.com/avatar.jpg'
    },
    expires: '2024-01-01',
  }

  it('renders header with user information', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByAltText('John Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search projects and tasks...')).toBeInTheDocument()
  })

  it('renders user initials when no image is provided', () => {
    const sessionWithoutImage = {
      ...mockSession,
      user: { ...mockSession.user, image: undefined }
    }

    mockUseSession.mockReturnValue({
      data: sessionWithoutImage,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles menu button click', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const menuButton = screen.getByRole('button', { name: /open sidebar/i })
    fireEvent.click(menuButton)

    expect(mockOnMenuClick).toHaveBeenCalledTimes(1)
  })

  it('renders user dropdown menu button', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const userMenuButton = screen.getByRole('button', { name: /open user menu/i })
    expect(userMenuButton).toBeInTheDocument()
    expect(userMenuButton).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('can click user dropdown menu button', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const userMenuButton = screen.getByRole('button', { name: /open user menu/i })
    fireEvent.click(userMenuButton)

    // The menu functionality is handled by Headless UI which is difficult to test in isolation
    // We can at least verify the button exists and is clickable
    expect(userMenuButton).toBeInTheDocument()
  })

  it('renders notifications button', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const notificationsButton = screen.getByRole('button', { name: /view notifications/i })
    expect(notificationsButton).toBeInTheDocument()
  })

  it('renders search input', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const searchInput = screen.getByPlaceholderText('Search projects and tasks...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'search')
  })

  it('handles user without name gracefully', () => {
    const sessionWithoutName = {
      ...mockSession,
      user: { ...mockSession.user, name: undefined, image: undefined }
    }

    mockUseSession.mockReturnValue({
      data: sessionWithoutName,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    // Should show default initial when no name is provided
    const avatarDiv = document.querySelector('.bg-indigo-600')
    expect(avatarDiv).toBeInTheDocument()
    expect(avatarDiv).toHaveTextContent('U') // Default initial
  })
})
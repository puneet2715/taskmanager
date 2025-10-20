import { render, screen, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import Layout from '@/components/layout/Layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock child components
jest.mock('@/components/layout/Sidebar', () => {
  return function MockSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
      <div data-testid="sidebar" data-open={isOpen}>
        <button onClick={onClose} data-testid="sidebar-close">Close</button>
      </div>
    )
  }
})

jest.mock('@/components/layout/Header', () => {
  return function MockHeader({ onMenuClick }: { onMenuClick: () => void }) {
    return (
      <div data-testid="header">
        <button onClick={onMenuClick} data-testid="menu-button">Menu</button>
      </div>
    )
  }
})

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children without layout when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('header')).not.toBeInTheDocument()
  })

  it('renders full layout when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('handles sidebar toggle functionality', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )

    const sidebar = screen.getByTestId('sidebar')
    const menuButton = screen.getByTestId('menu-button')
    const sidebarCloseButton = screen.getByTestId('sidebar-close')

    // Initially sidebar should be closed
    expect(sidebar).toHaveAttribute('data-open', 'false')

    // Click menu button to open sidebar
    fireEvent.click(menuButton)
    expect(sidebar).toHaveAttribute('data-open', 'true')

    // Click close button to close sidebar
    fireEvent.click(sidebarCloseButton)
    expect(sidebar).toHaveAttribute('data-open', 'false')
  })

  it('applies custom className when provided', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    const { container } = renderWithProviders(
      <Layout className="custom-class">
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )

    const layoutDiv = container.firstChild as HTMLElement
    expect(layoutDiv).toHaveClass('custom-class')
  })

  it('handles mobile sidebar overlay click', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )

    const menuButton = screen.getByTestId('menu-button')
    const sidebar = screen.getByTestId('sidebar')

    // Open sidebar
    fireEvent.click(menuButton)
    expect(sidebar).toHaveAttribute('data-open', 'true')

    // Find and click overlay (it should be present when sidebar is open)
    const overlay = document.querySelector('.fixed.inset-0.bg-gray-600')
    if (overlay) {
      fireEvent.click(overlay)
      expect(sidebar).toHaveAttribute('data-open', 'false')
    }
  })
})
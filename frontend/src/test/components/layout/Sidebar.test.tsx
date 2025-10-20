import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from '@/components/layout/Sidebar'
import { useProjects } from '@/hooks/useProjects'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock useProjects hook
jest.mock('@/hooks/useProjects')
const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>

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

describe('Sidebar', () => {
  const mockOnClose = jest.fn()
  const mockSession = {
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://example.com/avatar.jpg'
    },
    expires: '2024-01-01',
  }

  const mockProjects = [
    {
      _id: 'project1',
      name: 'Project One',
      description: 'First project',
      owner: 'user1',
      members: ['user1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'project2',
      name: 'Project Two',
      description: 'Second project',
      owner: 'user1',
      members: ['user1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })
    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('renders sidebar with correct styling when open', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    // Find the main sidebar container
    const sidebarContainer = document.querySelector('.fixed.inset-y-0.left-0')
    expect(sidebarContainer).toHaveClass('translate-x-0')
  })

  it('renders sidebar with correct styling when closed', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={false} onClose={mockOnClose} />)

    // Find the main sidebar container
    const sidebarContainer = document.querySelector('.fixed.inset-y-0.left-0')
    expect(sidebarContainer).toHaveClass('-translate-x-full')
  })

  it('renders navigation items correctly', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Task Manager')).toBeInTheDocument()
  })

  it('highlights current page in navigation', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-indigo-100', 'text-indigo-900')
  })

  it('renders projects list when projects are available', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Project One')).toBeInTheDocument()
    expect(screen.getByText('Project Two')).toBeInTheDocument()
  })

  it('shows loading state for projects', () => {
    mockUseProjects.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Projects')).toBeInTheDocument()
    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('shows empty state when no projects exist', () => {
    mockUseProjects.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
    expect(screen.getByText('Create your first project')).toBeInTheDocument()
  })

  it('highlights current project in projects list', () => {
    mockUsePathname.mockReturnValue('/projects/project1')
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const projectLink = screen.getByText('Project One').closest('a')
    expect(projectLink).toHaveClass('bg-indigo-100', 'text-indigo-900')
  })

  it('renders user information at bottom', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
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

    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('handles close button click', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when navigation links are clicked', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const dashboardLink = screen.getByText('Dashboard')
    fireEvent.click(dashboardLink)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when project links are clicked', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const projectLink = screen.getByText('Project One')
    fireEvent.click(projectLink)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('renders create project button', () => {
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const createButton = screen.getByTitle('Create new project')
    expect(createButton).toBeInTheDocument()
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

    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown)

    renderWithProviders(<Sidebar isOpen={true} onClose={mockOnClose} />)

    // Should show default initial when no name is provided
    // Look for the user avatar in the bottom section (not the logo)
    const userSection = document.querySelector('.border-t.border-gray-200')
    const userAvatarDiv = userSection?.querySelector('.bg-indigo-600')
    expect(userAvatarDiv).toBeInTheDocument()
    expect(userAvatarDiv).toHaveTextContent('U') // Default initial
  })
})
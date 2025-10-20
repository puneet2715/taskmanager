import { render, screen, waitFor } from '@testing-library/react';
import { getServerSession } from 'next-auth';
import DashboardClient from '@/app/dashboard/DashboardClient';
import DashboardLoading from '@/app/dashboard/loading';
import DashboardError from '@/app/dashboard/error';

// Mock Next.js auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
}));

// Mock RoleGuard component
jest.mock('@/components/auth/RoleGuard', () => {
  return function MockRoleGuard({ children, requiredRole, fallback }: any) {
    // For testing, assume user is admin if requiredRole is admin
    const isAdmin = requiredRole === 'admin';
    return isAdmin ? children : fallback || null;
  };
});

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin' as const,
};

const mockProjects = [
  {
    _id: '1',
    name: 'Website Redesign',
    description: 'Complete redesign of the company website',
    owner: '1',
    members: ['1', '2'],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    _id: '2',
    name: 'Mobile App Development',
    description: 'Develop a mobile app for iOS and Android',
    owner: '1',
    members: ['1', '3'],
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
];

describe('Dashboard SSR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DashboardClient', () => {
    it('renders user welcome message', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument();
      expect(screen.getByText("Here's what's happening with your projects today.")).toBeInTheDocument();
    });

    it('displays user profile information', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('renders stats cards', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Due This Week')).toBeInTheDocument();
    });

    it('displays correct project count', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Total projects count
    });

    it('renders project list with server-side data', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText('Complete redesign of the company website')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
      expect(screen.getByText('Develop a mobile app for iOS and Android')).toBeInTheDocument();
    });

    it('shows empty state when no projects', () => {
      render(<DashboardClient user={mockUser} initialProjects={[]} />);
      
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first project.')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('New Task')).toBeInTheDocument();
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('shows admin panel for admin users', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
    });

    it('renders recent activity section', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Task "Update homepage" completed')).toBeInTheDocument();
      expect(screen.getByText('New project "Mobile App" created')).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getByText('Updated Jan 20, 2024')).toBeInTheDocument();
      expect(screen.getByText('Updated Jan 18, 2024')).toBeInTheDocument();
    });

    it('renders icons', () => {
      render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
      
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(1); // Stats card only (no empty state when projects exist)
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('users-icon')).toHaveLength(3); // Stats card and project cards
      expect(screen.getAllByTestId('calendar-icon')).toHaveLength(3); // Stats card and project cards
      expect(screen.getAllByTestId('plus-icon')).toHaveLength(2); // Action buttons
    });
  });

  describe('DashboardLoading', () => {
    it('renders loading skeleton', () => {
      render(<DashboardLoading />);
      
      // Check for skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('has proper structure for loading state', () => {
      render(<DashboardLoading />);
      
      // Should have header, stats cards, and content areas
      expect(document.querySelector('.bg-white.shadow-sm.border-b')).toBeInTheDocument();
      expect(document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4')).toBeInTheDocument();
      expect(document.querySelector('.lg\\:col-span-2')).toBeInTheDocument();
    });
  });

  describe('DashboardError', () => {
    const mockError = new Error('Test error message');
    const mockReset = jest.fn();

    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders error message', () => {
      render(<DashboardError error={mockError} reset={mockReset} />);
      
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
      expect(screen.getByText('We encountered an error while loading your dashboard. This might be a temporary issue.')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<DashboardError error={mockError} reset={mockReset} />);
      
      expect(screen.getByText('Try again')).toBeInTheDocument();
      expect(screen.getByText('Go to homepage')).toBeInTheDocument();
    });

    it('calls reset function when try again is clicked', () => {
      render(<DashboardError error={mockError} reset={mockReset} />);
      
      const tryAgainButton = screen.getByText('Try again');
      tryAgainButton.click();
      
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('renders error icon', () => {
      render(<DashboardError error={mockError} reset={mockReset} />);
      
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(<DashboardError error={mockError} reset={mockReset} />);
      
      expect(console.error).toHaveBeenCalledWith('Dashboard error:', mockError);
    });
  });
});
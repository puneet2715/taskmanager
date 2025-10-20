import { render, screen } from '@testing-library/react';
import DashboardClient from '@/app/dashboard/DashboardClient';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
}));

// Mock RoleGuard component
jest.mock('@/components/auth/RoleGuard', () => {
  return function MockRoleGuard({ children, requiredRole }: any) {
    // This mock needs to be context-aware, but for simplicity, we'll use a global variable
    const currentUserRole = (global as any).currentUserRole || 'user';
    return requiredRole === currentUserRole ? children : null;
  };
});

describe('Dashboard SSR Integration', () => {
  const mockUser = {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user' as const,
  };

  const mockProjects = [
    {
      _id: '1',
      name: 'Website Redesign',
      description: 'Complete redesign of the company website',
      owner: 'user1',
      members: ['user1', 'user2'],
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
    },
    {
      _id: '2',
      name: 'Mobile App Development',
      description: 'Develop a mobile app for iOS and Android',
      owner: 'user1',
      members: ['user1', 'user3'],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-18T00:00:00Z',
    },
  ];

  it('should render server-side data immediately', () => {
    render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
    
    // Verify that server-side rendered data is immediately available
    expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument();
    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Project count
  });

  it('should handle empty projects from server', () => {
    render(<DashboardClient user={mockUser} initialProjects={[]} />);
    
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Project count
  });

  it('should display user information from session', () => {
    render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('should show project details from server-side data', () => {
    render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
    
    // Check project descriptions are rendered
    expect(screen.getByText('Complete redesign of the company website')).toBeInTheDocument();
    expect(screen.getByText('Develop a mobile app for iOS and Android')).toBeInTheDocument();
    
    // Check member counts
    expect(screen.getAllByText('2 members')).toHaveLength(2);
    
    // Check formatted dates
    expect(screen.getByText('Updated Jan 20, 2024')).toBeInTheDocument();
    expect(screen.getByText('Updated Jan 18, 2024')).toBeInTheDocument();
  });

  it('should not show admin panel for regular users', () => {
    (global as any).currentUserRole = 'user';
    render(<DashboardClient user={mockUser} initialProjects={mockProjects} />);
    
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should show admin panel for admin users', () => {
    (global as unknown).currentUserRole = 'admin';
    const adminUser = { ...mockUser, role: 'admin' as const };
    render(<DashboardClient user={adminUser} initialProjects={mockProjects} />);
    
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });
});
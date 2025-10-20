import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
}));

describe('Landing Page', () => {
  it('renders the main heading', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('Collaborate in')).toBeInTheDocument();
    expect(screen.getByText('Real-Time')).toBeInTheDocument();
  });

  it('renders the hero description', () => {
    render(<LandingPage />);
    
    expect(
      screen.getByText(/Transform your team's productivity with our intuitive task management platform/)
    ).toBeInTheDocument();
  });

  it('renders call-to-action buttons', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('Start Free Trial')).toBeInTheDocument();
    expect(screen.getByText('View Demo')).toBeInTheDocument();
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<LandingPage />);
    
    expect(screen.getAllByText('Features')).toHaveLength(2); // Header nav and footer
    expect(screen.getAllByText('Pricing')).toHaveLength(2); // Header nav and footer
    expect(screen.getAllByText('About')).toHaveLength(2); // Header nav and footer
  });

  it('renders authentication links', () => {
    render(<LandingPage />);
    
    const signInLinks = screen.getAllByText('Sign In');
    const getStartedLinks = screen.getAllByText(/Get Started/);
    
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(getStartedLinks.length).toBeGreaterThan(0);
  });

  it('renders feature sections', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Secure & Reliable')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<LandingPage />);
    
    expect(
      screen.getByText('See changes instantly as your team updates tasks. No more refresh needed.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Invite team members, assign tasks, and track progress together seamlessly.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enterprise-grade security with role-based access control and data protection.')
    ).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(<LandingPage />);
    
    expect(screen.getAllByText('TaskFlow')).toHaveLength(2); // Header and footer
    expect(
      screen.getByText('The modern way to manage tasks and collaborate with your team in real-time.')
    ).toBeInTheDocument();
    expect(screen.getByText('© 2025 TaskFlow. All rights reserved.')).toBeInTheDocument();
  });

  it('renders proper links with correct hrefs', () => {
    render(<LandingPage />);
    
    const signUpLinks = screen.getAllByRole('link', { name: /Get Started|Start Free Trial|Get Started Free/ });
    const signInLinks = screen.getAllByRole('link', { name: 'Sign In' });
    const demoLink = screen.getByRole('link', { name: 'View Demo' });
    
    expect(signUpLinks.some(link => link.getAttribute('href') === '/auth/signup')).toBe(true);
    expect(signInLinks.some(link => link.getAttribute('href') === '/auth/signin')).toBe(true);
    expect(demoLink.getAttribute('href')).toBe('/dashboard');
  });

  it('renders icons', () => {
    render(<LandingPage />);
    
    expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2); // Header and footer
    expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
  });

  it('has responsive design classes', () => {
    const { container } = render(<LandingPage />);
    
    // Check for responsive classes
    expect(container.querySelector('.md\\:text-6xl')).toBeInTheDocument();
    expect(container.querySelector('.sm\\:flex-row')).toBeInTheDocument();
    expect(container.querySelector('.md\\:grid-cols-3')).toBeInTheDocument();
    expect(container.querySelector('.md\\:grid-cols-4')).toBeInTheDocument();
  });
});
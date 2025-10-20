import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import AddMemberModal from '@/components/projects/AddMemberModal';
import { useUserSearch } from '@/hooks/useUsers';
import { useUpdateProject } from '@/hooks/useProjects';
import { Project, User } from '@/types/api';

// Mock dependencies
jest.mock('@/hooks/useUsers');
jest.mock('@/hooks/useProjects');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseUserSearch = useUserSearch as jest.MockedFunction<typeof useUserSearch>;
const mockUseUpdateProject = useUpdateProject as jest.MockedFunction<typeof useUpdateProject>;
const mockToast = toast as jest.Mocked<typeof toast>;

const mockProject: Project = {
  _id: 'project-1',
  name: 'Test Project',
  description: 'Test project description',
  owner: 'user-1',
  members: ['user-1'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockUsers: User[] = [
  {
    _id: 'user-2',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: 'user-3',
    email: 'jane@example.com',
    name: 'Jane Smith',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('AddMemberModal', () => {
  const mockOnClose = jest.fn();
  const mockUpdateMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateProject.mockReturnValue(mockUpdateMutation as any);
    mockUseUserSearch.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('renders modal when open', () => {
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Add Member')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter user\'s email address')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('searches for users when typing in search field', async () => {
    const user = userEvent.setup();
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as any);
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    expect(mockUseUserSearch).toHaveBeenCalledWith({
      query: 'john',
      enabled: true,
    });
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as any);
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('selects user from search results', async () => {
    const user = userEvent.setup();
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as any);
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on John Doe
    await user.click(screen.getByText('John Doe'));

    // Check that email field is populated
    const emailInput = screen.getByDisplayValue('john@example.com');
    expect(emailInput).toBeInTheDocument();

    // Check that selected user preview is shown
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('adds member to project when form is submitted', async () => {
    const user = userEvent.setup();
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as any);
    mockUpdateMutation.mutateAsync.mockResolvedValue(mockProject);
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Search and select user
    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    // Submit form
    const addButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'project-1',
        updates: {
          members: ['user-1', 'user-2'],
        },
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('John Doe has been added to the project');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error when user is already a member', async () => {
    const user = userEvent.setup();
    const projectWithExistingMember = {
      ...mockProject,
      members: ['user-1', 'user-2'], // user-2 is already a member
    };
    
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as any);
    
    render(
      <AddMemberModal
        project={projectWithExistingMember}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Search and select user that's already a member
    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    // Submit form
    const addButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('User is already a member of this project.');
    });

    expect(mockUpdateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Try to submit without email
    const addButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    // Enter invalid email
    const emailInput = screen.getByPlaceholderText('Enter user\'s email address');
    await user.type(emailInput, 'invalid-email');
    await user.click(addButton);

    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });

  it('handles update error', async () => {
    const user = userEvent.setup();
    mockUseUserSearch.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    } as unknown);
    mockUpdateMutation.mutateAsync.mockRejectedValue(new Error('Update failed'));
    
    render(
      <AddMemberModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Search and select user
    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    // Submit form
    const addButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to add member to project');
    });
  });
});
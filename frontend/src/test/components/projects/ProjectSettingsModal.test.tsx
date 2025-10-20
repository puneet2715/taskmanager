import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import ProjectSettingsModal from '@/components/projects/ProjectSettingsModal';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { Project } from '@/types/api';

// Mock dependencies
jest.mock('@/hooks/useProjects');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseUpdateProject = useUpdateProject as jest.MockedFunction<typeof useUpdateProject>;
const mockUseDeleteProject = useDeleteProject as jest.MockedFunction<typeof useDeleteProject>;
const mockToast = toast as jest.Mocked<typeof toast>;

const mockProject: Project = {
  _id: 'project-1',
  name: 'Test Project',
  description: 'Test project description',
  owner: 'user-1',
  members: ['user-1', 'user-2'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('ProjectSettingsModal', () => {
  const mockOnClose = jest.fn();
  const mockOnProjectDeleted = jest.fn();
  const mockUpdateMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };
  const mockDeleteMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateProject.mockReturnValue(mockUpdateMutation as any);
    mockUseDeleteProject.mockReturnValue(mockDeleteMutation as unknown);
  });

  it('renders modal when open', () => {
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    expect(screen.getByText('Project Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test project description')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={false}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    expect(screen.queryByText('Project Settings')).not.toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Initially on General tab
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();

    // Switch to Members tab
    await user.click(screen.getByText('Members'));
    expect(screen.getByText('Project Members')).toBeInTheDocument();
    expect(screen.getByText('2 member(s)')).toBeInTheDocument();

    // Switch to Danger Zone tab
    await user.click(screen.getByText('Danger Zone'));
    expect(screen.getByText('Delete Project')).toBeInTheDocument();
  });

  it('updates project when form is submitted', async () => {
    const user = userEvent.setup();
    mockUpdateMutation.mutateAsync.mockResolvedValue(mockProject);
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Update project name
    const nameInput = screen.getByDisplayValue('Test Project');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Project Name');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'project-1',
        updates: {
          name: 'Updated Project Name',
          description: 'Test project description',
        },
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Project updated successfully');
  });

  it('handles update error', async () => {
    const user = userEvent.setup();
    mockUpdateMutation.mutateAsync.mockRejectedValue(new Error('Update failed'));
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Update project name
    const nameInput = screen.getByDisplayValue('Test Project');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Project Name');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update project');
    });
  });

  it('shows delete confirmation and deletes project', async () => {
    const user = userEvent.setup();
    mockDeleteMutation.mutateAsync.mockResolvedValue(undefined);
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Switch to Danger Zone tab
    await user.click(screen.getByText('Danger Zone'));

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    await user.click(deleteButton);

    // Confirm deletion
    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /yes, delete project/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith('project-1');
    });

    expect(mockToast.success).toHaveBeenCalledWith('Project deleted successfully');
    expect(mockOnProjectDeleted).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles delete error', async () => {
    const user = userEvent.setup();
    mockDeleteMutation.mutateAsync.mockRejectedValue(new Error('Delete failed'));
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Switch to Danger Zone tab
    await user.click(screen.getByText('Danger Zone'));

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /yes, delete project/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to delete project');
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    // Clear project name
    const nameInput = screen.getByDisplayValue('Test Project');
    await user.clear(nameInput);

    // Try to submit
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(screen.getByText('Project name is required')).toBeInTheDocument();
    expect(mockUpdateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('disables save button when no changes made', () => {
    render(
      <ProjectSettingsModal
        project={mockProject}
        isOpen={true}
        onClose={mockOnClose}
        onProjectDeleted={mockOnProjectDeleted}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });
});
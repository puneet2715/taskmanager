import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { ProjectSelector } from '@/components/tasks/ProjectSelector';
import { Project } from '@/types/api';

// Mock the hooks
jest.mock('@/hooks/useProjects');

const mockUseProjects = require('@/hooks/useProjects').useProjects as jest.Mock;

const mockProjects: Project[] = [
  {
    _id: 'project1',
    name: 'Project One',
    description: 'First project description',
    owner: 'user1',
    members: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'project2',
    name: 'Project Two',
    description: 'Second project description',
    owner: 'user1',
    members: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    _id: 'project3',
    name: 'Project Three',
    description: undefined, // Test project without description
    owner: 'user1',
    members: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

describe('ProjectSelector', () => {
  const defaultProps = {
    selectedProjectId: 'project1',
    onProjectChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjects.mockReturnValue({
      data: mockProjects,
      isLoading: false,
    });
  });

  it('renders loading state', () => {
    mockUseProjects.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<ProjectSelector {...defaultProps} />);

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('renders no projects state', () => {
    mockUseProjects.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ProjectSelector {...defaultProps} />);

    expect(screen.getByText('No projects available')).toBeInTheDocument();
  });

  it('renders selected project name', () => {
    render(<ProjectSelector {...defaultProps} />);

    expect(screen.getByText('Project One')).toBeInTheDocument();
  });

  it('renders "Select Project" when no project is selected', () => {
    render(<ProjectSelector {...defaultProps} selectedProjectId="" />);

    expect(screen.getByText('Select Project')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    expect(screen.getByTestId('project-option-project1')).toBeInTheDocument();
    expect(screen.getByTestId('project-option-project2')).toBeInTheDocument();
    expect(screen.getByTestId('project-option-project3')).toBeInTheDocument();
  });

  it('closes dropdown when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    expect(screen.getByTestId('project-option-project1')).toBeInTheDocument();

    // Click backdrop - find the backdrop element
    const backdrop = document.querySelector('.fixed.inset-0.z-10');
    if (backdrop) {
      await user.click(backdrop as Element);
    }

    expect(screen.queryByTestId('project-option-project1')).not.toBeInTheDocument();
  });

  it('calls onProjectChange when project is selected', async () => {
    const user = userEvent.setup();
    const onProjectChange = jest.fn();

    render(<ProjectSelector {...defaultProps} onProjectChange={onProjectChange} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    // Select different project
    const projectOption = screen.getByTestId('project-option-project2');
    await user.click(projectOption);

    expect(onProjectChange).toHaveBeenCalledWith('project2');
  });

  it('closes dropdown after project selection', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    // Select project
    const projectOption = screen.getByTestId('project-option-project2');
    await user.click(projectOption);

    // Dropdown should be closed
    expect(screen.queryByTestId('project-option-project1')).not.toBeInTheDocument();
  });

  it('highlights selected project in dropdown', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    const selectedOption = screen.getByTestId('project-option-project1');
    const unselectedOption = screen.getByTestId('project-option-project2');

    expect(selectedOption).toHaveClass('bg-blue-50', 'text-blue-700');
    expect(unselectedOption).toHaveClass('text-gray-900');
    expect(unselectedOption).not.toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('renders project descriptions in dropdown', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    expect(screen.getByText('First project description')).toBeInTheDocument();
    expect(screen.getByText('Second project description')).toBeInTheDocument();
  });

  it('handles projects without descriptions', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    const projectThreeOption = screen.getByTestId('project-option-project3');
    expect(projectThreeOption).toHaveTextContent('Project Three');
    // Should not have description text
    expect(projectThreeOption).not.toHaveTextContent('description');
  });

  it('rotates arrow icon when dropdown is open', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    const button = screen.getByTestId('project-selector-button');
    const arrow = button.querySelector('svg');

    // Initially not rotated
    expect(arrow).not.toHaveClass('rotate-180');

    // Open dropdown
    await user.click(button);

    // Should be rotated
    expect(arrow).toHaveClass('rotate-180');
  });

  it('works without onProjectChange callback', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector selectedProjectId="project1" />);

    // Open dropdown
    const button = screen.getByTestId('project-selector-button');
    await user.click(button);

    // Select project (should not throw error)
    const projectOption = screen.getByTestId('project-option-project2');
    await user.click(projectOption);

    // Should close dropdown
    expect(screen.queryByTestId('project-option-project1')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ProjectSelector {...defaultProps} />);

    const button = screen.getByTestId('project-selector-button');
    
    // Focus and open with Enter
    button.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('project-option-project1')).toBeInTheDocument();
  });
});
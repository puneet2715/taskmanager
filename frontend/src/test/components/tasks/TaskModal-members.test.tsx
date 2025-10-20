// import React from 'react';
// import { render, screen, waitFor } from '@testing-library/react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { TaskModal } from '@/components/tasks/TaskModal';
// import { useProject } from '@/hooks/useProjects';
// import { useAllUsers } from '@/hooks/useUsers';

// // Mock the hooks
// jest.mock('@/hooks/useProjects');
// jest.mock('@/hooks/useUsers');
// jest.mock('@/hooks/useTasks');

// const mockUseProject = useProject as jest.MockedFunction<typeof useProject>;
// const mockUseAllUsers = useAllUsers as jest.MockedFunction<typeof useAllUsers>;

// const createWrapper = () => {
//   const queryClient = new QueryClient({
//     defaultOptions: {
//       queries: { retry: false },
//       mutations: { retry: false },
//     },
//   });
  
//   return ({ children }: { children: React.ReactNode }) => (
//     <QueryClientProvider client={queryClient}>
//       {children}
//     </QueryClientProvider>
//   );
// };

// describe('TaskModal - Project Members', () => {
//   beforeEach(() => {
//     // Mock useProjects to return empty array
//     jest.doMock('@/hooks/useProjects', () => ({
//       useProjects: () => ({ data: [], isLoading: false }),
//       useProject: mockUseProject,
//     }));

//     // Mock useTasks
//     jest.doMock('@/hooks/useTasks', () => ({
//       useCreateTask: () => ({ mutateAsync: jest.fn() }),
//       useUpdateTask: () => ({ mutateAsync: jest.fn() }),
//     }));
//   });

//   it('should show only project members in assignee dropdown', async () => {
//     const mockProject = {
//       _id: 'project1',
//       name: 'Test Project',
//       description: 'Test Description',
//       owner: 'user1',
//       members: ['user1', 'user2'], // Member IDs
//       createdAt: '2024-01-01T00:00:00Z',
//       updatedAt: '2024-01-01T00:00:00Z',
//     };

//     const mockUsers = [
//       { _id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'user' },
//       { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
//       { _id: 'user3', name: 'Bob Wilson', email: 'bob@example.com', role: 'user' }, // Not a member
//     ];

//     mockUseProject.mockReturnValue({
//       data: mockProject,
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     mockUseAllUsers.mockReturnValue({
//       data: mockUsers,
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     render(
//       <TaskModal
//         projectId="project1"
//         onClose={jest.fn()}
//       />,
//       { wrapper: createWrapper() }
//     );

//     await waitFor(() => {
//       const assigneeSelect = screen.getByLabelText('Assignee');
//       expect(assigneeSelect).toBeInTheDocument();
//     });

//     // Check that only project members are shown
//     const assigneeSelect = screen.getByLabelText('Assignee');
//     const options = assigneeSelect.querySelectorAll('option');
    
//     // Should have "Unassigned" + 2 project members = 3 options
//     expect(options).toHaveLength(3);
    
//     // Check option values
//     const optionValues = Array.from(options).map(option => (option as HTMLOptionElement).value);
//     expect(optionValues).toEqual(['', 'user1', 'user2']);
    
//     // Check option text
//     const optionTexts = Array.from(options).map(option => option.textContent);
//     expect(optionTexts).toEqual([
//       'Unassigned',
//       'John Doe (john@example.com)',
//       'Jane Smith (jane@example.com)'
//     ]);
    
//     // Verify that user3 (Bob Wilson) is NOT in the options
//     expect(optionTexts).not.toContain('Bob Wilson (bob@example.com)');
//   });

//   it('should show populated user objects when members are already populated', async () => {
//     const mockProject = {
//       _id: 'project1',
//       name: 'Test Project',
//       description: 'Test Description',
//       owner: 'user1',
//       members: [ // Populated user objects
//         { _id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'user' },
//         { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
//       ],
//       createdAt: '2024-01-01T00:00:00Z',
//       updatedAt: '2024-01-01T00:00:00Z',
//     };

//     mockUseProject.mockReturnValue({
//       data: mockProject,
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     mockUseAllUsers.mockReturnValue({
//       data: [],
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     render(
//       <TaskModal
//         projectId="project1"
//         onClose={jest.fn()}
//       />,
//       { wrapper: createWrapper() }
//     );

//     await waitFor(() => {
//       const assigneeSelect = screen.getByLabelText('Assignee');
//       expect(assigneeSelect).toBeInTheDocument();
//     });

//     const assigneeSelect = screen.getByLabelText('Assignee');
//     const options = assigneeSelect.querySelectorAll('option');
    
//     // Should have "Unassigned" + 2 project members = 3 options
//     expect(options).toHaveLength(3);
    
//     // Check option text
//     const optionTexts = Array.from(options).map(option => option.textContent);
//     expect(optionTexts).toEqual([
//       'Unassigned',
//       'John Doe (john@example.com)',
//       'Jane Smith (jane@example.com)'
//     ]);
//   });

//   it('should show "No members in this project" when project has no members', async () => {
//     const mockProject = {
//       _id: 'project1',
//       name: 'Test Project',
//       description: 'Test Description',
//       owner: 'user1',
//       members: [], // No members
//       createdAt: '2024-01-01T00:00:00Z',
//       updatedAt: '2024-01-01T00:00:00Z',
//     };

//     mockUseProject.mockReturnValue({
//       data: mockProject,
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     mockUseAllUsers.mockReturnValue({
//       data: [],
//       isLoading: false,
//       error: null,
//       isError: false,
//       isSuccess: true,
//     } as any);

//     render(
//       <TaskModal
//         projectId="project1"
//         onClose={jest.fn()}
//       />,
//       { wrapper: createWrapper() }
//     );

//     await waitFor(() => {
//       expect(screen.getByText('No members in this project')).toBeInTheDocument();
//     });

//     const assigneeSelect = screen.getByLabelText('Assignee');
//     const options = assigneeSelect.querySelectorAll('option');
    
//     // Should only have "Unassigned" option
//     expect(options).toHaveLength(1);
//     expect(options[0].textContent).toBe('Unassigned');
//   });
// });
'use client';

import { useState, useMemo } from 'react';
import { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useCreateProject, useDashboardProjects } from '@/hooks/useProjects';
import { useDashboardTasks } from '@/hooks/useTasks';
import { Project } from '@/types/api';
import { Calendar, Users, CheckCircle, Plus, TrendingUp, LogOut } from 'lucide-react';

interface DashboardClientProps {
  user: User;
  initialProjects: Project[];
}

export default function DashboardClient({ user, initialProjects }: DashboardClientProps) {
  const router = useRouter();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
  });

  // Use React Query to manage projects data with initial data from SSR
  // Use dashboard-specific hook with shorter staleTime to ensure fresh data on navigation
  const { data: projects = initialProjects, isLoading: projectsLoading } = useDashboardProjects();
  const createProjectMutation = useCreateProject();

  // Get all tasks across user's projects for accurate statistics
  const projectIds = projects.map(project => project._id);
  const { data: allTasks = [], isLoading: tasksLoading } = useDashboardTasks(projectIds);

  // Calculate statistics from all projects and tasks
  const statistics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalProjects: 0,
        activeTasks: 0,
        teamMembers: 0,
        dueThisWeek: 0
      };
    }

    // Get unique team members across all projects
    const allMembers = new Set<string>();
    projects.forEach(project => {
      project.members.forEach(member => {
        const memberId = typeof member === 'string' ? member : member._id;
        allMembers.add(memberId);
      });
    });

    // Calculate task statistics from real data
    const activeTasks = allTasks.filter(task => task.status !== 'done').length;
    
    // Calculate tasks due this week
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeek = allTasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= oneWeekFromNow;
    }).length;

    return {
      totalProjects: projects.length,
      activeTasks,
      teamMembers: allMembers.size,
      dueThisWeek
    };
  }, [projects, allTasks]);

  const handleCreateProject = () => {
    setShowProjectModal(true);
  };

  const handleCreateTask = () => {
    // TaskModal will handle project selection internally
    if (projects.length > 0) {
      setShowTaskModal(true);
    } else {
      alert('Please create a project first before adding tasks');
    }
  };

  const handleViewProject = (projectId: string) => {
    // Use replace instead of push for more reliable navigation
    router.replace(`/projects/${projectId}`);
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle error gracefully - still attempt to redirect
      router.push('/auth/signin');
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name.trim()) return;

    try {
      console.log('Creating project with data:', {
        name: newProjectForm.name.trim(),
        description: newProjectForm.description.trim(),
      });

      await createProjectMutation.mutateAsync({
        name: newProjectForm.name.trim(),
        description: newProjectForm.description.trim(),
      });

      console.log('Project created successfully');

      // React Query will automatically update the projects list
      setShowProjectModal(false);
      setNewProjectForm({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create project: ${errorMessage}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
              <p className="mt-1 text-gray-600">
                Here&apos;s what&apos;s happening with your projects today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateTask}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
              <button
                onClick={handleCreateProject}
                className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-100 p-2">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projectsLoading ? '...' : statistics.totalProjects}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projectsLoading || tasksLoading ? '...' : statistics.activeTasks}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projectsLoading ? '...' : statistics.teamMembers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-100 p-2">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Due This Week</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projectsLoading || tasksLoading ? '...' : statistics.dueThisWeek}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Projects List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
              </div>
              <div className="p-6">
                {projectsLoading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                    <p className="text-gray-600">Loading projects...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">No projects yet</h3>
                    <p className="mb-4 text-gray-600">
                      Get started by creating your first project.
                    </p>
                    <button
                      onClick={handleCreateProject}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div
                        key={project._id}
                        className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="mb-1 text-lg font-medium text-gray-900">
                              {project.name}
                            </h3>
                            <p className="mb-2 text-sm text-gray-600">{project.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Users className="mr-1 h-4 w-4" />
                                {(() => {
                                  // Handle both string[] and User[] types properly
                                  if (Array.isArray(project.members)) {
                                    return project.members.length;
                                  } else if (project.members) {
                                    return 0;
                                  }
                                  return 0;
                                })()} members
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-4 w-4" />
                                Updated {formatDate(project.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                console.log('Navigating to project:', project._id, `/projects/${project._id}`);
                                handleViewProject(project._id);
                              }}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              View →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Profile</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-800">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Panel */}
            <RoleGuard requiredRole="admin">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Admin Panel</h3>
                <div className="space-y-3">
                  <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    Manage Users
                  </button>
                  <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    System Settings
                  </button>
                  <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    View Analytics
                  </button>
                </div>
              </div>
            </RoleGuard>

            {/* Recent Activity */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm text-gray-900">Task "Update homepage" completed</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-sm text-gray-900">New project &ldquo;Mobile App&rdquo; created</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-yellow-500"></div>
                  <div>
                    <p className="text-sm text-gray-900">Team member added to project</p>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} />
      )}

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="projectName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Project Name *
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectForm.name}
                  onChange={e => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="projectDescription"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="projectDescription"
                  value={newProjectForm.description}
                  onChange={e =>
                    setNewProjectForm(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project description"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

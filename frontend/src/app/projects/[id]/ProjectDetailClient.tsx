'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useProject } from '@/hooks/useProjects';
import { ProjectBoard } from '@/components/tasks/ProjectBoard';
import ProjectSettingsModal from '@/components/projects/ProjectSettingsModal';
import AddMemberModal from '@/components/projects/AddMemberModal';
import { useSocketContext } from '@/components/providers/SocketProvider';
import { UserPresence } from '@/components/common/UserPresence';

import { ArrowLeft, Settings, Users, Calendar, UserPlus } from 'lucide-react';

interface ProjectDetailClientProps {
  projectId: string;
  user: User;
}

export default function ProjectDetailClient({ projectId, user }: ProjectDetailClientProps) {
  const router = useRouter();
  const { data: project, isLoading, error } = useProject(projectId);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const { joinProject, leaveProject, isConnected } = useSocketContext();
  const hasJoinedProjectRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleProjectDeleted = () => {
    router.push('/dashboard');
  };

  // Join project room when component mounts and project is loaded
  useEffect(() => {
    if (projectId && isConnected && !hasJoinedProjectRef.current) {
      // Clear any pending join timeout
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }

      // Debounce the join operation to prevent rapid join/leave cycles
      joinTimeoutRef.current = setTimeout(() => {
        console.log('Joining project room:', projectId);
        joinProject(projectId);
        hasJoinedProjectRef.current = true;
      }, 100); // 100ms debounce
    }

    // Leave project room when component unmounts or connection is lost
    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }

      if (hasJoinedProjectRef.current) {
        console.log('Leaving project room:', projectId);
        leaveProject(projectId);
        hasJoinedProjectRef.current = false;
      }
    };
  }, [isConnected, joinProject, leaveProject, projectId]); // Removed project from dependencies to prevent reconnection on project updates

  // Handle connection state changes
  useEffect(() => {
    if (!isConnected && hasJoinedProjectRef.current) {
      // Connection lost, reset join state
      hasJoinedProjectRef.current = false;
    }
  }, [isConnected]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading project...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="mb-2 text-red-600">Failed to load project</p>
              <p className="mb-4 text-sm text-gray-500">
                {error instanceof Error ? error.message : 'Project not found'}
              </p>
              <button
                onClick={handleBackToDashboard}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="block lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center space-x-2 text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm">Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
                  title="Add Member"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <h1 className="text-xl font-bold text-gray-900 line-clamp-2">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{project.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{Array.isArray(project.members) ? project.members.length : 0} members</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatDate(project.updatedAt)}</span>
              </span>
              <UserPresence className="border-l border-gray-300 pl-3" />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center space-x-2 text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="mt-1 text-gray-600">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>{Array.isArray(project.members) ? project.members.length : 0} members</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Updated {formatDate(project.updatedAt)}</span>
              </div>
              {/* Real-time user presence */}
              <UserPresence className="border-l border-gray-300 pl-4" />
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">
          <ProjectBoard
            projectId={projectId}
            onProjectChange={newProjectId => {
              router.push(`/projects/${newProjectId}`);
            }}
          />
        </div>
      </div>

      {/* Add Member Modal */}
      {project && (
        <AddMemberModal
          project={project}
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
        />
      )}

      {/* Project Settings Modal */}
      {project && (
        <ProjectSettingsModal
          project={project}
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onProjectDeleted={handleProjectDeleted}
        />
      )}
    </div>
  );
}

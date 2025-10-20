'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { X, Users, Trash2, Save, UserMinus } from 'lucide-react';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { Project } from '@/types/api';
import toast from 'react-hot-toast';

interface ProjectSettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onProjectDeleted?: () => void;
}

interface ProjectFormData {
  name: string;
  description: string;
}

export default function ProjectSettingsModal({ 
  project, 
  isOpen, 
  onClose, 
  onProjectDeleted 
}: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  const { data: session } = useSession();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProjectFormData>({
    defaultValues: {
      name: project.name,
      description: project.description || '',
    },
  });

  // Reset form when project changes
  useEffect(() => {
    reset({
      name: project.name,
      description: project.description || '',
    });
  }, [project.name, project.description, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      console.log('Updating project settings - project ID:', project._id);
      console.log('Updating project settings - data:', data);
      
      await updateProjectMutation.mutateAsync({
        id: project._id,
        updates: data,
      });
      // Success message is handled by the mutation hook
      reset(data); // Reset form with new values to clear isDirty state
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProjectMutation.mutateAsync(project._id);
      toast.success('Project deleted successfully');
      onProjectDeleted?.();
      onClose();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      // Get current members array
      const currentMembers = Array.isArray(project.members)
        ? project.members.map(member => (typeof member === 'string' ? member : member._id))
        : [];

      // Remove the member
      const updatedMembers = currentMembers.filter(id => id !== memberId);
      
      await updateProjectMutation.mutateAsync({
        id: project._id,
        updates: {
          members: updatedMembers,
        },
      });

      setMemberToRemove(null);
      // Success message is handled by the mutation hook
    } catch (error) {
      toast.error('Failed to remove member from project');
      setMemberToRemove(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Project Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Members
              </button>
              <button
                onClick={() => setActiveTab('danger')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'danger'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Danger Zone
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'general' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name', { 
                      required: 'Project name is required',
                      minLength: { value: 1, message: 'Project name cannot be empty' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                    placeholder="Enter project description..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || updateProjectMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Project Members</h3>
                  
                  {Array.isArray(project.members) && project.members.length > 0 ? (
                    <div className="space-y-3">
                      {project.members.map((member) => {
                        const memberData = typeof member === 'string' ? { _id: member, name: 'Unknown User', email: 'unknown@email.com' } : member;
                        const isCurrentUser = session?.user?.email === memberData.email;
                        const isOwner = project.owner === memberData._id || (typeof project.owner === 'object' && project.owner._id === memberData._id);
                        
                        return (
                          <div key={memberData._id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {/* Avatar */}
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <span className="text-sm font-medium text-blue-600">
                                  {memberData.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              
                              {/* User Info */}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {memberData.name || 'Unknown User'}
                                  </p>
                                  {isOwner && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Owner
                                    </span>
                                  )}
                                  {isCurrentUser && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{memberData.email || 'unknown@email.com'}</p>
                              </div>
                            </div>
                            
                            {/* Remove Button */}
                            {!isOwner && !isCurrentUser && (
                              <div className="flex items-center space-x-2">
                                {memberToRemove === memberData._id ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Remove?</span>
                                    <button
                                      onClick={() => handleRemoveMember(memberData._id)}
                                      disabled={updateProjectMutation.isPending}
                                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                      <span className="text-xs">Yes</span>
                                    </button>
                                    <button
                                      onClick={() => setMemberToRemove(null)}
                                      className="text-gray-600 hover:text-gray-800"
                                    >
                                      <span className="text-xs">No</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setMemberToRemove(memberData._id)}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Remove member"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Owner/Current User Info */}
                            {(isOwner || isCurrentUser) && !(memberToRemove === memberData._id) && (
                              <div className="text-sm text-gray-400">
                                {isOwner && isCurrentUser ? 'Project Owner' : isOwner ? 'Owner' : 'Cannot remove yourself'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No members</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This project doesn't have any members yet.
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Use the "Add Member&quot; button in the project header to invite new members to this project.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start space-x-3">
                      <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-900">Delete Project</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Once you delete a project, there is no going back. This will permanently delete 
                          the project and all associated tasks, comments, and data.
                        </p>
                        <div className="mt-4">
                          {!showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Delete Project
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-red-900">
                                Are you absolutely sure? This action cannot be undone.
                              </p>
                              <div className="flex space-x-3">
                                <button
                                  onClick={handleDeleteProject}
                                  disabled={deleteProjectMutation.isPending}
                                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  {deleteProjectMutation.isPending ? 'Deleting...' : 'Yes, Delete Project'}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
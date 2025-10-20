'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, UserPlus, Search, Mail } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUsers';
import { useUpdateProject } from '@/hooks/useProjects';
import { Project, User } from '@/types/api';
import toast from 'react-hot-toast';

interface AddMemberModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

interface AddMemberFormData {
  email: string;
}

export default function AddMemberModal({ project, isOpen, onClose }: AddMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null | undefined>(null);

  const { data: searchResults = [], isLoading: isSearching } = useUserSearch({
    query: searchQuery,
    enabled: searchQuery.length > 2,
  });

  const updateProjectMutation = useUpdateProject();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AddMemberFormData>();

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setValue('email', user.email);
    setSearchQuery('');
  };

  const onSubmit = async (data: AddMemberFormData) => {
    try {
      // Get current members array
      const currentMembers = Array.isArray(project.members)
        ? project.members.map(member => (typeof member === 'string' ? member : member._id))
        : [];

      // Find user by email if not already selected
      let userToAdd = selectedUser;
      if (!userToAdd) {
        userToAdd = searchResults.find(user => user.email === data.email);
        if (!userToAdd) {
          toast.error('User not found. Please search and select a user.');
          return;
        }
      }

      // Check if user is already a member
      if (currentMembers.includes(userToAdd._id)) {
        toast.error('User is already a member of this project.');
        return;
      }

      // Add user to project
      const updatedMembers = [...currentMembers, userToAdd._id];
      
      console.log('Adding member - current members:', currentMembers);
      console.log('Adding member - updated members:', updatedMembers);
      console.log('Adding member - project ID:', project._id);

      await updateProjectMutation.mutateAsync({
        id: project._id,
        updates: {
          members: updatedMembers,
        },
      });

      toast.success(`${userToAdd.name} has been added to the project`);
      reset();
      setSelectedUser(null);
      setSearchQuery('');
      onClose();
    } catch {
      toast.error('Failed to add member to project');
    }
  };

  const handleClose = () => {
    reset();
    setSelectedUser(null);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-xl font-semibold text-gray-900">Add Member</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User Search */}
              <div>
                <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
                  Search Users
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search by name or email..."
                  />
                </div>

                {/* Search Results */}
                {searchQuery.length > 2 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {isSearching ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="mx-auto h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm">Searching...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-1">
                        {searchResults.map(user => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                                <span className="text-sm text-gray-600">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm text-gray-500">No users found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user's email address"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Selected User Preview */}
              {selectedUser && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <span className="text-sm text-blue-600">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{selectedUser.name}</p>
                      <p className="text-xs text-blue-700">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="flex items-center space-x-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{updateProjectMutation.isPending ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

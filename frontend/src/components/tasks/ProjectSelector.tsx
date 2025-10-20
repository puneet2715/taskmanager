'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';

interface ProjectSelectorProps {
  selectedProjectId: string;
  onProjectChange?: (projectId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectChange,
}) => {
  const { data: projects = [], isLoading } = useProjects();
  const [isOpen, setIsOpen] = useState(false);

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  const handleProjectSelect = (projectId: string) => {
    onProjectChange?.(projectId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-gray-600">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-gray-600">
        No projects available
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="project-selector-button"
      >
        <span className="font-medium text-gray-900">
          {selectedProject?.name || 'Select Project'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {projects.map((project) => (
                <button
                  key={project._id}
                  onClick={() => handleProjectSelect(project._id)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                    project._id === selectedProjectId
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-900'
                  }`}
                  data-testid={`project-option-${project._id}`}
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {project.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
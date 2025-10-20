'use client';

import React, { useState } from 'react';
import { Task, User, AIResponse } from '@/types/api';
import { useDeleteTask } from '@/hooks/useTasks';
import { useAIAvailability } from '@/hooks/useAI';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sparkles } from 'lucide-react';
import { TaskAIModal } from '@/components/ai';
import Image from 'next/image';

interface TaskCardProps {
  task: Task;
  projectId: string;
  onEdit: () => void;
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  projectId,
  onEdit,
  isDragging = false,
}) => {
  const deleteTaskMutation = useDeleteTask(projectId);
  const { isAvailable: isAIAvailable } = useAIAvailability();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: isDragging, // Disable sortable when used in overlay
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTaskMutation.mutateAsync(task._id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getAssigneeName = (assignee?: string | User) => {
    if (!assignee) return null;
    if (typeof assignee === 'string') return 'Unknown User';
    return assignee.name;
  };

  const getAssigneeAvatar = (assignee?: string | User) => {
    if (!assignee || typeof assignee === 'string') return null;
    return assignee.avatar;
  };

  const handleAIClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAIModalOpen(true);
  };

  const handleAIModalClose = () => {
    setIsAIModalOpen(false);
  };

  const handleQuestionAnswered = (response: AIResponse) => {
    console.log('AI response received:', response);
    // You can add additional logic here if needed
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
        isSortableDragging ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
      data-testid={`task-card-${task._id}`}
      {...attributes}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start space-x-2 flex-1">
          {/* Drag Handle */}
          <div 
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-1"
            title="Drag to move task"
            {...listeners}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <h4 
            className="font-medium text-gray-900 flex-1 pr-2 cursor-pointer hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            {task.title}
          </h4>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleAIClick}
            disabled={!isAIAvailable}
            className={`p-1 transition-colors ${
              isAIAvailable
                ? 'text-gray-400 hover:text-purple-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title={isAIAvailable ? 'Ask AI about this task' : 'AI service is not available'}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-blue-600 p-1"
            title="Edit task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete task"
            disabled={deleteTaskMutation.isPending}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Priority Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span className="text-xs text-gray-500">
              Due: {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center space-x-1">
            {getAssigneeAvatar(task.assignee) ? (
              <Image
                src={getAssigneeAvatar(task.assignee)!}
                alt={getAssigneeName(task.assignee) || 'Assignee'}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-600">
                  {getAssigneeName(task.assignee)?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600">
              {getAssigneeName(task.assignee)}
            </span>
          </div>
        )}
      </div>

      {/* Loading State for Delete */}
      {deleteTaskMutation.isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" role="status" aria-label="Deleting task"></div>
        </div>
      )}

      {/* AI Modal */}
      <TaskAIModal
        task={task}
        isOpen={isAIModalOpen}
        onClose={handleAIModalClose}
        onQuestionAnswered={handleQuestionAnswered}
      />
    </div>
  );
};
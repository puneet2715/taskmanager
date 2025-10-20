'use client';

import React from 'react';
import { Task, AIResponse } from '@/types/api';
import { TaskAIQuestion } from './TaskAIQuestion';
import { X } from 'lucide-react';

interface TaskAIModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onQuestionAnswered?: (response: AIResponse) => void;
}

export const TaskAIModal: React.FC<TaskAIModalProps> = ({
  task,
  isOpen,
  onClose,
  onQuestionAnswered,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ask AI about Task</h2>
            <p className="text-sm text-gray-600 mt-1 truncate">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <TaskAIQuestion
            task={task}
            onQuestionAnswered={onQuestionAnswered}
          />
        </div>
      </div>
    </div>
  );
};
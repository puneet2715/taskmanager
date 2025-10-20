'use client';

import React from 'react';
import { Task } from '@/types/api';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface TaskColumnProps {
  status: Task['status'];
  title: string;
  tasks: Task[];
  projectId: string;
  onEditTask: (task: Task) => void;
  className?: string;
  isDragInProgress?: boolean;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  status,
  title,
  tasks,
  projectId,
  onEditTask,
  className = 'bg-gray-100',
  isDragInProgress = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
  });

  const taskIds = tasks.map(task => task._id);

  return (
    <div className="flex-1 min-w-72 sm:min-w-80">
      {/* Column Header */}
      <div className={`${className} rounded-lg p-3 mb-3 sm:p-4 sm:mb-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{title}</h3>
          <span className="bg-white text-gray-600 text-xs sm:text-sm px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div 
        ref={setNodeRef}
        className={`space-y-2 sm:space-y-3 min-h-64 sm:min-h-96 p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-200'
        } ${isDragInProgress ? 'pointer-events-none' : ''}`}
        data-testid={`task-column-${status}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 sm:h-32 text-gray-400">
              <p className="text-xs sm:text-sm">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                projectId={projectId}
                onEdit={() => onEditTask(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};
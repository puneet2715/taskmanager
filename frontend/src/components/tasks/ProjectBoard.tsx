'use client';

import React, { useState } from 'react';
import { Task } from '@/types/api';
import { useTasks, useMoveTask } from '@/hooks/useTasks';
import { useAIAvailability } from '@/hooks/useAI';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { ProjectSelector } from './ProjectSelector';
import { ProjectSummaryModal } from '@/components/ai';
import { Sparkles } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';

interface ProjectBoardProps {
  projectId: string;
  onProjectChange?: (projectId: string) => void;
}

const TASK_STATUSES = [
  { key: 'todo' as const, label: 'To Do', color: 'bg-gray-100' },
  { key: 'inprogress' as const, label: 'In Progress', color: 'bg-blue-100' },
  { key: 'done' as const, label: 'Done', color: 'bg-green-100' },
];

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
  projectId,
  onProjectChange,
}) => {
  const { data: tasks = [], isLoading, error } = useTasks(projectId);
  const moveTaskMutation = useMoveTask(projectId);
  const { isAvailable: isAIAvailable } = useAIAvailability();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragInProgress, setIsDragInProgress] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = TASK_STATUSES.reduce((acc, status) => {
    acc[status.key] = tasks
      .filter(task => task.status === status.key)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleOpenSummaryModal = () => {
    setIsSummaryModalOpen(true);
  };

  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
    setActiveTask(task || null);
    setIsDragInProgress(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setIsDragInProgress(false);

    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    
    // Check if dropping over a column or another task
    let newStatus: Task['status'];
    let newPosition: number;

    if (overId.startsWith('column-')) {
      // Dropping over a column
      newStatus = overId.replace('column-', '') as Task['status'];
      const tasksInColumn = tasksByStatus[newStatus];
      newPosition = tasksInColumn.length;
    } else {
      // Dropping over another task
      const overTask = tasks.find(t => t._id === overId);
      if (!overTask) return;

      newStatus = overTask.status;
      const tasksInColumn = tasksByStatus[newStatus];
      const overIndex = tasksInColumn.findIndex(t => t._id === overId);
      newPosition = overIndex;
    }

    // Only move if status or position changed
    if (activeTask.status !== newStatus || activeTask.position !== newPosition) {
      try {
        await moveTaskMutation.mutateAsync({
          id: activeTask._id,
          moveData: {
            status: newStatus,
            position: newPosition,
          },
        });
      } catch (error) {
        console.error('Failed to move task:', error);
        // Error handling is already implemented in the useMoveTask hook
        // which includes optimistic updates and rollback on failure
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading tasks"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load tasks</p>
          <p className="text-gray-500 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <ProjectSelector
            selectedProjectId={projectId}
            onProjectChange={onProjectChange}
          />
          <button
            onClick={handleCreateTask}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Task
          </button>
          <button
            onClick={handleOpenSummaryModal}
            disabled={!isAIAvailable}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isAIAvailable
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={isAIAvailable ? 'Open AI Summary' : 'AI service is not available'}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Summary</span>
          </button>
        </div>
      </div>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex-1 flex space-x-6 overflow-x-auto ${isDragInProgress ? 'select-none' : ''}`}>
          {TASK_STATUSES.map((status) => (
            <TaskColumn
              key={status.key}
              status={status.key}
              title={status.label}
              tasks={tasksByStatus[status.key]}
              projectId={projectId}
              onEditTask={handleEditTask}
              className={status.color}
              isDragInProgress={isDragInProgress}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90">
              <TaskCard
                task={activeTask}
                projectId={projectId}
                onEdit={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <TaskModal
          projectId={projectId}
          task={editingTask}
          onClose={handleCloseModal}
        />
      )}

      {/* AI Summary Modal */}
      <ProjectSummaryModal
        projectId={projectId}
        isOpen={isSummaryModalOpen}
        onClose={handleCloseSummaryModal}
        onSummaryGenerated={(summary) => {
          console.log('Project summary generated:', summary);
        }}
      />
    </div>
  );
};
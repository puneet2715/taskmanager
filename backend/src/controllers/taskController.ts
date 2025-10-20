import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Task, TaskStatus } from '../models/Task';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';
import { logger } from '../utils/logger';
import { SocketService } from '../services/socketService';

export class TaskController {
  // GET /api/projects/:id/tasks - Get all tasks for a project
  static async getProjectTasks(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid project ID'
          }
        });
        return;
      }

      // Check if project exists and user is a member
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
        return;
      }

      if (!project.isMember(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You are not a member of this project'
          }
        });
        return;
      }

      // Get tasks sorted by status and position
      const tasks = await (Task as any).findByProject(new mongoose.Types.ObjectId(projectId));

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      logger.error('Error fetching project tasks:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_TASKS_ERROR',
          message: 'Failed to fetch tasks'
        }
      });
    }
  }

  // POST /api/projects/:id/tasks - Create a new task
  static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const { title, description, priority, assignee, dueDate } = req.body;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid project ID'
          }
        });
        return;
      }

      // Validate required fields
      if (!title || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Task title is required'
          }
        });
        return;
      }

      // Check if project exists and user is a member
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
        return;
      }

      if (!project.isMember(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You are not a member of this project'
          }
        });
        return;
      }

      // Validate assignee if provided
      if (assignee && !mongoose.Types.ObjectId.isValid(assignee)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSIGNEE',
            message: 'Invalid assignee ID'
          }
        });
        return;
      }

      // If assignee is provided, check if they are a project member
      if (assignee) {
        const assigneeId = new mongoose.Types.ObjectId(assignee);
        if (!project.isMember(assigneeId)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ASSIGNEE',
              message: 'Assignee must be a project member'
            }
          });
          return;
        }
      }

      // Calculate position for new task (add to end of 'todo' column)
      const maxPositionTask = await Task.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        status: 'todo'
      }).sort({ position: -1 }).select('position');
      
      const position = maxPositionTask ? maxPositionTask.position + 1 : 0;

      const task = new Task({
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'medium',
        assignee: assignee ? new mongoose.Types.ObjectId(assignee) : null,
        project: new mongoose.Types.ObjectId(projectId),
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: userId,
        status: 'todo',
        position: position
      });

      const savedTask = await task.save();
      
      // Populate the saved task with user details
      await savedTask.populate('assignee', 'name email avatar');
      await savedTask.populate('createdBy', 'name email avatar');

      // Log activity
      const activityLog = new ActivityLog({
        action: 'created',
        entityType: 'task',
        entityId: savedTask._id,
        user: userId,
        project: new mongoose.Types.ObjectId(projectId),
        changes: {
          title: savedTask.title,
          status: savedTask.status,
          priority: savedTask.priority
        }
      });
      await activityLog.save();

      // Emit socket event for real-time updates
      SocketService.emitTaskCreate(projectId, savedTask.toObject());

      res.status(201).json({
        success: true,
        data: savedTask,
        message: 'Task created successfully'
      });
    } catch (error) {
      logger.error('Error creating task:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_TASK_ERROR',
          message: 'Failed to create task'
        }
      });
    }
  }

  // PUT /api/tasks/:id - Update a task
  static async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, status, priority, assignee, dueDate } = req.body;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid task ID'
          }
        });
        return;
      }

      const task = await Task.findById(id).populate('project');
      
      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found'
          }
        });
        return;
      }

      // Check if user is a member of the project
      const project = task.project as any;
      if (!project.isMember(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You are not a member of this project'
          }
        });
        return;
      }

      // Track changes for activity log
      const changes: any = {};
      const oldValues: any = {};

      // Update fields
      if (title !== undefined) {
        if (!title || title.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Task title cannot be empty'
            }
          });
          return;
        }
        oldValues.title = task.title;
        task.title = title.trim();
        changes.title = task.title;
      }

      if (description !== undefined) {
        oldValues.description = task.description;
        task.description = description?.trim() || null;
        changes.description = task.description;
      }

      if (priority !== undefined) {
        if (!['low', 'medium', 'high'].includes(priority)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Priority must be one of: low, medium, high'
            }
          });
          return;
        }
        oldValues.priority = task.priority;
        task.priority = priority;
        changes.priority = task.priority;
      }

      if (assignee !== undefined) {
        if (assignee && !mongoose.Types.ObjectId.isValid(assignee)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ASSIGNEE',
              message: 'Invalid assignee ID'
            }
          });
          return;
        }

        // If assignee is provided, check if they are a project member
        if (assignee) {
          const assigneeId = new mongoose.Types.ObjectId(assignee);
          if (!project.isMember(assigneeId)) {
            res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_ASSIGNEE',
                message: 'Assignee must be a project member'
              }
            });
            return;
          }
        }

        oldValues.assignee = task.assignee;
        (task as any).assignee = assignee ? new mongoose.Types.ObjectId(assignee) : null;
        changes.assignee = task.assignee;
      }

      if (dueDate !== undefined) {
        oldValues.dueDate = task.dueDate;
        (task as any).dueDate = dueDate ? new Date(dueDate) : null;
        changes.dueDate = task.dueDate;
      }

      // Handle status change (this may involve position recalculation)
      if (status !== undefined) {
        if (!['todo', 'inprogress', 'done'].includes(status)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Status must be one of: todo, inprogress, done'
            }
          });
          return;
        }

        if (status !== task.status) {
          oldValues.status = task.status;
          await (task as any).changeStatus(status as TaskStatus);
          changes.status = task.status;
        }
      }

      const updatedTask = await task.save();
      
      // Populate with user details
      await updatedTask.populate('assignee', 'name email avatar');
      await updatedTask.populate('createdBy', 'name email avatar');

      // Log activity if there were changes
      if (Object.keys(changes).length > 0) {
        const activityLog = new ActivityLog({
          action: 'updated',
          entityType: 'task',
          entityId: updatedTask._id,
          user: userId,
          project: task.project,
          changes: {
            old: oldValues,
            new: changes
          }
        });
        await activityLog.save();
      }

      // Emit socket event for real-time updates
      SocketService.emitTaskUpdate(project._id.toString(), updatedTask.toObject());

      res.status(200).json({
        success: true,
        data: updatedTask,
        message: 'Task updated successfully'
      });
    } catch (error) {
      logger.error('Error updating task:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_TASK_ERROR',
          message: 'Failed to update task'
        }
      });
    }
  }

  // DELETE /api/tasks/:id - Delete a task
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid task ID'
          }
        });
        return;
      }

      const task = await Task.findById(id).populate('project');
      
      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found'
          }
        });
        return;
      }

      // Check if user is a member of the project
      const project = task.project as any;
      if (!project.isMember(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You are not a member of this project'
          }
        });
        return;
      }

      // Store task info for activity log
      const taskInfo = {
        title: task.title,
        status: task.status,
        priority: task.priority
      };

      // Delete the task
      await Task.findByIdAndDelete(id);

      // Log activity
      const activityLog = new ActivityLog({
        action: 'deleted',
        entityType: 'task',
        entityId: new mongoose.Types.ObjectId(id),
        user: userId,
        project: task.project,
        changes: taskInfo
      });
      await activityLog.save();

      // Emit socket event for real-time updates
      SocketService.emitTaskDelete(project._id.toString(), id);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_TASK_ERROR',
          message: 'Failed to delete task'
        }
      });
    }
  }

  // PUT /api/tasks/:id/move - Move a task (change status and/or position)
  static async moveTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, position } = req.body;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid task ID'
          }
        });
        return;
      }

      // Validate required fields
      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required'
          }
        });
        return;
      }

      if (!['todo', 'inprogress', 'done'].includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status must be one of: todo, inprogress, done'
          }
        });
        return;
      }

      const task = await Task.findById(id).populate('project');
      
      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found'
          }
        });
        return;
      }

      // Check if user is a member of the project
      const project = task.project as any;
      if (!project.isMember(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You are not a member of this project'
          }
        });
        return;
      }

      const oldStatus = task.status;
      const oldPosition = task.position;

      // Move the task
      await (task as any).changeStatus(status as TaskStatus, position);

      // Populate with user details
      await task.populate('assignee', 'name email avatar');
      await task.populate('createdBy', 'name email avatar');

      // Log activity
      const activityLog = new ActivityLog({
        action: 'moved',
        entityType: 'task',
        entityId: task._id,
        user: userId,
        project: task.project,
        changes: {
          old: { status: oldStatus, position: oldPosition },
          new: { status: task.status, position: task.position }
        }
      });
      await activityLog.save();

      // Emit socket event for real-time updates
      SocketService.emitTaskMove(project._id.toString(), task._id.toString(), task.status, task.position);

      res.status(200).json({
        success: true,
        data: task,
        message: 'Task moved successfully'
      });
    } catch (error) {
      logger.error('Error moving task:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MOVE_TASK_ERROR',
          message: 'Failed to move task'
        }
      });
    }
  }
}
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { SocketService } from '../services/socketService';

export class ProjectController {
  // GET /api/projects - Get all projects for the authenticated user
  static async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      
      const projects = await (Project as any).findByUser(userId);
      
      res.status(200).json({
        success: true,
        data: projects,
        count: projects.length
      });
    } catch (error) {
      logger.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_PROJECTS_ERROR',
          message: 'Failed to fetch projects'
        }
      });
    }
  }

  // POST /api/projects - Create a new project
  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate required fields
      if (!name || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project name is required'
          }
        });
        return;
      }

      const project = new Project({
        name: name.trim(),
        description: description?.trim() || null,
        owner: userId,
        members: [userId] // Owner is automatically a member
      });

      const savedProject = await project.save();
      
      // Populate the saved project with user details
      await savedProject.populate('owner', 'name email avatar');
      await savedProject.populate('members', 'name email avatar');

      res.status(201).json({
        success: true,
        data: savedProject,
        message: 'Project created successfully'
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project data',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_PROJECT_ERROR',
          message: 'Failed to create project'
        }
      });
    }
  }

  // PUT /api/projects/:id - Update a project
  static updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, members } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid project ID'
        }
      });
      return;
    }

    const project = await Project.findById(id);
    
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

    // Check permissions - owner can update everything, members can only update certain fields
    const isOwner = project.isOwner(userId);
    const isMember = project.isMember(userId);
    
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You are not a member of this project'
        }
      });
      return;
    }

    // Only owner can update name, description, and members
    if ((name !== undefined || description !== undefined || members !== undefined) && !isOwner) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only project owner can update project details'
        }
      });
      return;
    }

    // Update fields
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project name cannot be empty'
          }
        });
        return;
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = description?.trim() || null;
    }

    // Initialize removedMemberIds outside the if block
    let removedMemberIds: string[] = [];

    if (members !== undefined) {
      // Validate members array
      if (!Array.isArray(members)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Members must be an array'
          }
        });
        return;
      }

      // Validate each member ID
      const memberIds = [];
      for (const memberId of members) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid member ID: ${memberId}`
            }
          });
          return;
        }
        memberIds.push(new mongoose.Types.ObjectId(memberId));
      }

      // Ensure owner is always included in members
      const ownerObjectId = new mongoose.Types.ObjectId(project.owner);
      if (!memberIds.some(id => id.equals(ownerObjectId))) {
        memberIds.push(ownerObjectId);
      }

      // Detect removed members for socket notification
      const oldMemberIds = project.members.map(member => member.toString());
      const newMemberIds = memberIds.map(member => member.toString());
      removedMemberIds = oldMemberIds.filter(oldId => !newMemberIds.includes(oldId));

      project.members = memberIds;
    }

    const updatedProject = await project.save();
    
    // Populate with user details
    await updatedProject.populate('owner', 'name email avatar');
    await updatedProject.populate('members', 'name email avatar');

    // Emit socket event for real-time updates
    SocketService.emitProjectUpdate(id, updatedProject.toObject());

    // Emit member removal event if members were removed
    if (members !== undefined && removedMemberIds.length > 0) {
      SocketService.emitMemberRemoved(id, removedMemberIds);
    }

    res.status(200).json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  });

  // DELETE /api/projects/:id - Delete a project
  static async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid project ID'
          }
        });
        return;
      }

      const project = await Project.findById(id);
      
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

      // Check ownership - only owner can delete project
      if (!project.isOwner(userId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only project owner can delete the project'
          }
        });
        return;
      }

      // Delete all tasks associated with the project first
      await Task.deleteMany({ project: id });
      
      // Delete the project
      await Project.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Project and all associated tasks deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_PROJECT_ERROR',
          message: 'Failed to delete project'
        }
      });
    }
  }

  // GET /api/projects/:id - Get a specific project
  static async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid project ID'
          }
        });
        return;
      }

      const project = await Project.findById(id)
        .populate('owner', 'name email avatar')
        .populate('members', 'name email avatar');
      
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

      // Check if user is a member of the project
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

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      logger.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_PROJECT_ERROR',
          message: 'Failed to fetch project'
        }
      });
    }
  }
}
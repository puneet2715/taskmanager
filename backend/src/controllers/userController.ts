import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export class UserController {
  // GET /api/users/profile - Get current user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_PROFILE_ERROR',
          message: 'Failed to fetch user profile'
        }
      });
    }
  }

  // PUT /api/users/profile - Update current user profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { name, avatar } = req.body;

      const user = await User.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
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
              message: 'Name cannot be empty'
            }
          });
          return;
        }
        user.name = name.trim();
      }

      if (avatar !== undefined) {
        user.avatar = avatar?.trim() || null;
      }

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user data',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: 'Failed to update user profile'
        }
      });
    }
  }

  // GET /api/users/search - Search users for assignment
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 10 } = req.query;

      // Allow empty query for getting all users (useful for assignee dropdown)
      if (q !== undefined && typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query must be a string'
          }
        });
        return;
      }

      const searchLimit = Math.min(parseInt(limit as string) || 10, 50); // Max 50 results

      // Build search criteria
      let searchCriteria: any = {};
      
      if (q && q.trim().length > 0) {
        const searchQuery = q.trim();
        searchCriteria = {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        };
      }
      // If no query provided, return all users (useful for assignee dropdown)

      // If projectId is provided, we might want to prioritize project members
      // For now, we'll just search all users
      const users = await User.find(searchCriteria)
        .select('name email avatar role')
        .limit(searchLimit)
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
        query: q || ''
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_USERS_ERROR',
          message: 'Failed to search users'
        }
      });
    }
  }

  // GET /api/users/:id - Get user by ID (for public profile)
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid user ID'
          }
        });
        return;
      }

      const user = await User.findById(id).select('name email avatar role createdAt');
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USER_ERROR',
          message: 'Failed to fetch user'
        }
      });
    }
  }

  // POST /api/users/batch - Get multiple users by IDs
  static async getUsersByIds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User IDs array is required'
          }
        });
        return;
      }

      // Validate all IDs
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      
      if (validIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid user IDs provided'
          }
        });
        return;
      }

      // Limit to prevent abuse
      if (validIds.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Too many user IDs requested (max 100)'
          }
        });
        return;
      }

      const users = await User.find({ _id: { $in: validIds } })
        .select('name email avatar role createdAt');

      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
        requested: validIds.length
      });
    } catch (error) {
      logger.error('Error fetching users by IDs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USERS_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  }

  // GET /api/users - Get all users (admin only)
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search } = req.query;
      
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100 results
      const skip = (pageNum - 1) * limitNum;

      // Build search criteria
      let searchCriteria: any = {};
      if (search && typeof search === 'string' && search.trim().length > 0) {
        const searchQuery = search.trim();
        searchCriteria = {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        };
      }

      const [users, total] = await Promise.all([
        User.find(searchCriteria)
          .select('name email avatar role createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        User.countDocuments(searchCriteria)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      logger.error('Error fetching all users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USERS_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  }
}
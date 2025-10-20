import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { aiService } from '../services/aiService';
import { AISummary } from '../models/AISummary';
import { AIQuestion } from '../models/AIQuestion';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { logger } from '../utils/logger';
import { 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  ExternalServiceError,
  RateLimitError 
} from '../utils/errors';

export class AIController {
  /**
   * POST /api/ai/projects/:id/summary - Generate project summary
   */
  static async generateProjectSummary(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ValidationError('Invalid project ID');
      }

      // Check if project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      if (!project.isMember(userId)) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Check for cached summary with intelligent TTL management
      const cachedSummary = await AIController.getCachedSummaryWithTTL(projectId, userId);
      
      if (cachedSummary) {
        logger.info('Returning cached project summary', { 
          projectId, 
          userId,
          cacheAge: Date.now() - cachedSummary.generatedAt.getTime()
        });
        
        res.status(200).json({
          success: true,
          data: {
            projectId: cachedSummary.projectId,
            summary: cachedSummary.summary,
            taskCount: cachedSummary.taskCount,
            statusBreakdown: cachedSummary.statusBreakdown,
            generatedAt: cachedSummary.generatedAt,
            userId: cachedSummary.userId,
            cached: true,
            cacheExpiresAt: cachedSummary.expiresAt
          },
          message: 'Project summary retrieved from cache'
        });
        return;
      }

      // Generate new summary using AI service
      const summary = await aiService.generateProjectSummary(projectId, userId.toString());

      // Save summary to database with intelligent TTL
      const ttlHours = await AIController.calculateOptimalTTL(projectId);
      const aiSummary = new AISummary({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId,
        summary: summary.summary,
        taskCount: summary.taskCount,
        statusBreakdown: summary.statusBreakdown,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      });

      await aiSummary.save();

      // Clean up old summaries for this project/user combination
      await AIController.cleanupOldSummaries(projectId, userId);

      logger.info('Successfully generated and saved project summary', { 
        projectId, 
        userId,
        taskCount: summary.taskCount 
      });

      res.status(200).json({
        success: true,
        data: {
          ...summary,
          cached: false
        },
        message: 'Project summary generated successfully'
      });
    } catch (error) {
      logger.error('Error generating project summary:', {
        projectId: req.params['id'],
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      // Handle AI service specific errors
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('QUOTA')) {
          throw new RateLimitError('AI service quota exceeded. Please try again later.');
        }
        if (error.message.includes('rate limit') || error.message.includes('RATE_LIMIT')) {
          throw new RateLimitError('AI service rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('not properly configured')) {
          throw new ExternalServiceError('AI Service', 'Service is not properly configured');
        }
      }

      throw new ExternalServiceError('AI Service', 'Failed to generate project summary');
    }
  }

  /**
   * GET /api/ai/projects/:id/summary/latest - Get latest project summary
   */
  static async getLatestProjectSummary(req: Request, res: Response): Promise<void> {
    const { id: projectId } = req.params;
    const userId = req.user?.userId;

    logger.info('[AI Controller] getLatestProjectSummary called', {
      projectId,
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Validate ObjectId
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        logger.warn('[AI Controller] Invalid project ID provided', { projectId });
        throw new ValidationError('Invalid project ID');
      }

      logger.info('[AI Controller] Looking up project', { projectId });
      
      // Check if project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        logger.warn('[AI Controller] Project not found', { projectId });
        throw new NotFoundError('Project');
      }

      logger.info('[AI Controller] Project found, checking membership', {
        projectId,
        projectName: project.name,
        userId,
        projectMembers: project.members?.length || 0
      });

      if (!project.isMember(userObjectId)) {
        logger.warn('[AI Controller] User is not a member of project', {
          projectId,
          userId,
          projectMembers: project.members?.map(m => m.toString()) || []
        });
        throw new AuthorizationError('You are not a member of this project');
      }

      logger.info('[AI Controller] User access verified, searching for latest summary');

      // Get latest summary
      const latestSummary = await AISummary.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: userObjectId
      }).sort({ generatedAt: -1 });

      if (!latestSummary) {
        logger.info('[AI Controller] No summary found for project', { projectId, userId });
        res.status(200).json({
          success: true,
          data: null,
          message: 'No summary found for this project'
        });
        return;
      }

      logger.info('[AI Controller] Latest summary found', {
        projectId,
        userId,
        summaryId: latestSummary._id,
        generatedAt: latestSummary.generatedAt,
        taskCount: latestSummary.taskCount
      });

      res.status(200).json({
        success: true,
        data: {
          projectId: latestSummary.projectId,
          summary: latestSummary.summary,
          taskCount: latestSummary.taskCount,
          statusBreakdown: latestSummary.statusBreakdown,
          generatedAt: latestSummary.generatedAt,
          userId: latestSummary.userId
        },
        message: 'Latest project summary retrieved successfully'
      });

      logger.info('[AI Controller] getLatestProjectSummary completed successfully');
    } catch (error) {
      logger.error('[AI Controller] Error retrieving latest project summary:', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      throw new ExternalServiceError('AI Service', 'Failed to retrieve project summary');
    }
  }

  /**
   * POST /api/ai/tasks/:id/question - Ask question about a task with conversation support
   */
  static async answerTaskQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id: taskId } = req.params;
      const { question, conversationId } = req.body;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate ObjectId
      if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ValidationError('Invalid task ID');
      }

      // Validate question
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new ValidationError('Question is required and must be a non-empty string');
      }

      if (question.length > 1000) {
        throw new ValidationError('Question must be less than 1000 characters');
      }

      // Validate conversationId if provided
      if (conversationId && (typeof conversationId !== 'string' || conversationId.length > 100)) {
        throw new ValidationError('Invalid conversation ID format');
      }

      // Check if task exists and user has access
      const task = await Task.findById(taskId).populate('project');
      if (!task) {
        throw new NotFoundError('Task');
      }

      const project = task.project as any;
      if (!project.isMember(userId)) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Validate conversation ownership if conversationId is provided
      if (conversationId) {
        const existingConversation = await AIQuestion.findOne({
          conversationId,
          taskId: new mongoose.Types.ObjectId(taskId),
          userId
        });

        if (!existingConversation) {
          throw new AuthorizationError('Invalid conversation ID or access denied');
        }
      }

      // Generate AI response with conversation context
      const aiResponse = await aiService.answerTaskQuestion(
        taskId, 
        question.trim(), 
        userId.toString(),
        conversationId
      );

      // Save question and response to database with enhanced context
      const aiQuestion = new AIQuestion({
        taskId: new mongoose.Types.ObjectId(taskId),
        userId,
        question: question.trim(),
        answer: aiResponse.answer,
        confidence: aiResponse.confidence,
        conversationId: aiResponse.conversationId,
        context: {
          taskTitle: task.title,
          taskDescription: task.description || '',
          projectName: project.name,
          projectId: new mongoose.Types.ObjectId(project._id)
        }
      });

      await aiQuestion.save();

      // Get conversation statistics
      const conversationStats = await AIController.getConversationStats(aiResponse.conversationId);

      logger.info('Successfully answered task question', { 
        taskId, 
        userId,
        questionLength: question.length,
        answerLength: aiResponse.answer.length,
        confidence: aiResponse.confidence,
        conversationId: aiResponse.conversationId,
        isFollowUp: !!conversationId,
        conversationLength: conversationStats.totalQuestions
      });

      res.status(200).json({
        success: true,
        data: {
          ...aiResponse,
          conversationStats
        },
        message: conversationId 
          ? 'Follow-up question answered successfully' 
          : 'Question answered successfully'
      });
    } catch (error) {
      logger.error('Error answering task question:', {
        taskId: req.params['id'],
        userId: req.user?.userId,
        conversationId: req.body?.conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      // Handle AI service specific errors
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('QUOTA')) {
          throw new RateLimitError('AI service quota exceeded. Please try again later.');
        }
        if (error.message.includes('rate limit') || error.message.includes('RATE_LIMIT')) {
          throw new RateLimitError('AI service rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('not properly configured')) {
          throw new ExternalServiceError('AI Service', 'Service is not properly configured');
        }
        if (error.message.includes('timeout')) {
          throw new ExternalServiceError('AI Service', 'Request timeout - please try again');
        }
        if (error.message.includes('network') || error.message.includes('ECONNRESET')) {
          throw new ExternalServiceError('AI Service', 'Network error - please try again');
        }
        
        // Log unexpected errors for debugging
        logger.error('Unexpected error in answerTaskQuestion:', {
          taskId: req.params['id'],
          userId: req.user?.userId,
          errorMessage: error.message,
          errorStack: error.stack
        });
      }

      throw new ExternalServiceError('AI Service', 'Failed to answer task question');
    }
  }

  /**
   * GET /api/ai/tasks/:id/questions/history - Get question history for a task
   */
  static async getTaskQuestionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id: taskId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const limit = parseInt((req.query['limit'] as string) || '10', 10);
      const offset = parseInt((req.query['offset'] as string) || '0', 10);

      // Validate ObjectId
      if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ValidationError('Invalid task ID');
      }

      // Validate pagination parameters
      if (limit < 1 || limit > 50) {
        throw new ValidationError('Limit must be between 1 and 50');
      }

      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Check if task exists and user has access
      const task = await Task.findById(taskId).populate('project');
      if (!task) {
        throw new NotFoundError('Task');
      }

      const project = task.project as any;
      if (!project.isMember(userId)) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Get question history
      const questions = await AIQuestion.find({
        taskId: new mongoose.Types.ObjectId(taskId)
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .select('question answer confidence context createdAt userId');

      const totalCount = await AIQuestion.countDocuments({
        taskId: new mongoose.Types.ObjectId(taskId)
      });

      res.status(200).json({
        success: true,
        data: questions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + questions.length < totalCount
        },
        message: 'Question history retrieved successfully'
      });
    } catch (error) {
      logger.error('Error retrieving task question history:', {
        taskId: req.params['id'],
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      throw new ExternalServiceError('AI Service', 'Failed to retrieve question history');
    }
  }

  /**
   * GET /api/ai/status - Get AI service status
   */
  static async getAIStatus(req: Request, res: Response): Promise<void> {
    logger.info('[AI Controller] getAIStatus called', {
      userId: req.user?.userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      logger.info('[AI Controller] Calling aiService.getServiceStatus()');
      const status = await aiService.getServiceStatus();
      
      logger.info('[AI Controller] AI service status received:', {
        configured: status.configured,
        connected: status.connected,
        quotaAvailable: status.quota.available,
        quotaRemaining: status.quota.requestsRemaining,
        quotaLimit: status.quota.quotaLimit
      });

      // Transform the status to match frontend expectations
      const transformedStatus = {
        available: status.configured && status.connected && status.quota.available,
        quotaRemaining: status.quota.requestsRemaining,
        quotaLimit: status.quota.quotaLimit,
        requestsToday: status.quota.quotaLimit - status.quota.requestsRemaining
      };

      logger.info('[AI Controller] Transformed status:', transformedStatus);

      res.status(200).json({
        success: true,
        data: transformedStatus,
        message: 'AI service status retrieved successfully'
      });

      logger.info('[AI Controller] getAIStatus completed successfully');
    } catch (error) {
      logger.error('[AI Controller] Error retrieving AI service status:', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new ExternalServiceError('AI Service', 'Failed to retrieve service status');
    }
  }

  /**
   * Get cached summary with intelligent TTL management
   */
  private static async getCachedSummaryWithTTL(projectId: string, userId: mongoose.Types.ObjectId): Promise<any | null> {
    try {
      // First, check for non-expired cached summaries
      const validCachedSummary = await AISummary.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId,
        expiresAt: { $gt: new Date() }
      }).sort({ generatedAt: -1 });

      if (validCachedSummary) {
        return validCachedSummary;
      }

      // Check if project has recent activity that would invalidate cache
      const recentActivityThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
      const recentTaskActivity = await Task.countDocuments({
        project: new mongoose.Types.ObjectId(projectId),
        updatedAt: { $gte: recentActivityThreshold }
      });

      // If there's recent activity, don't use expired cache
      if (recentTaskActivity > 0) {
        return null;
      }

      // For projects with low activity, allow slightly expired cache (up to 2 hours old)
      const extendedCacheThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const extendedCachedSummary = await AISummary.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId,
        generatedAt: { $gte: extendedCacheThreshold }
      }).sort({ generatedAt: -1 });

      if (extendedCachedSummary) {
        // Extend the expiration time
        extendedCachedSummary.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        await extendedCachedSummary.save();
        return extendedCachedSummary;
      }

      return null;
    } catch (error) {
      logger.error('Error checking cached summary', { projectId, userId, error });
      return null;
    }
  }

  /**
   * Calculate optimal TTL based on project activity patterns
   */
  private static async calculateOptimalTTL(projectId: string): Promise<number> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Analyze recent activity
      const recentActivity = await Task.countDocuments({
        project: new mongoose.Types.ObjectId(projectId),
        updatedAt: { $gte: oneDayAgo }
      });

      const weeklyActivity = await Task.countDocuments({
        project: new mongoose.Types.ObjectId(projectId),
        updatedAt: { $gte: oneWeekAgo }
      });

      const totalTasks = await Task.countDocuments({
        project: new mongoose.Types.ObjectId(projectId)
      });

      // Calculate activity rate
      const dailyActivityRate = recentActivity / Math.max(totalTasks, 1);
      const weeklyActivityRate = weeklyActivity / Math.max(totalTasks, 1);

      // Determine TTL based on activity patterns
      if (dailyActivityRate > 0.3) {
        // High activity: short cache (30 minutes)
        return 0.5;
      } else if (dailyActivityRate > 0.1) {
        // Medium activity: medium cache (2 hours)
        return 2;
      } else if (weeklyActivityRate > 0.1) {
        // Low but some activity: longer cache (6 hours)
        return 6;
      } else {
        // Very low activity: longest cache (24 hours)
        return 24;
      }
    } catch (error) {
      logger.error('Error calculating optimal TTL', { projectId, error });
      // Default to 2 hours on error
      return 2;
    }
  }

  /**
   * GET /api/ai/conversations/:id - Get conversation details
   */
  static async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id: conversationId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      // Validate conversationId
      if (!conversationId || typeof conversationId !== 'string') {
        throw new ValidationError('Invalid conversation ID');
      }

      // Get conversation with access validation
      const conversation = await AIQuestion.find({
        conversationId,
        userId
      })
        .populate('taskId', 'title description status priority')
        .populate('userId', 'name email avatar')
        .sort({ createdAt: 1 });

      if (conversation.length === 0) {
        throw new NotFoundError('Conversation not found or access denied');
      }

      // Get conversation statistics
      const stats = await AIController.getConversationStats(conversationId);

      res.status(200).json({
        success: true,
        data: {
          conversationId,
          questions: conversation,
          stats
        },
        message: 'Conversation retrieved successfully'
      });
    } catch (error) {
      logger.error('Error retrieving conversation:', {
        conversationId: req.params['id'],
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      throw new ExternalServiceError('AI Service', 'Failed to retrieve conversation');
    }
  }

  /**
   * GET /api/ai/tasks/:id/conversations - Get all conversations for a task
   */
  static async getTaskConversations(req: Request, res: Response): Promise<void> {
    try {
      const { id: taskId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const limit = parseInt((req.query['limit'] as string) || '10', 10);

      // Validate ObjectId
      if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ValidationError('Invalid task ID');
      }

      // Check if task exists and user has access
      const task = await Task.findById(taskId).populate('project');
      if (!task) {
        throw new NotFoundError('Task');
      }

      const project = task.project as any;
      if (!project.isMember(userId)) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Get unique conversations for this task
      const conversations = await AIQuestion.aggregate([
        {
          $match: {
            taskId: new mongoose.Types.ObjectId(taskId)
          }
        },
        {
          $group: {
            _id: '$conversationId',
            firstQuestion: { $first: '$question' },
            lastQuestion: { $last: '$question' },
            questionCount: { $sum: 1 },
            averageConfidence: { $avg: '$confidence' },
            startedAt: { $min: '$createdAt' },
            lastActivity: { $max: '$createdAt' },
            userId: { $first: '$userId' }
          }
        },
        {
          $sort: { lastActivity: -1 }
        },
        {
          $limit: limit
        }
      ]);

      // Populate user information
      await AIQuestion.populate(conversations, {
        path: 'userId',
        select: 'name email avatar'
      });

      res.status(200).json({
        success: true,
        data: conversations,
        message: 'Task conversations retrieved successfully'
      });
    } catch (error) {
      logger.error('Error retrieving task conversations:', {
        taskId: req.params['id'],
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      throw new ExternalServiceError('AI Service', 'Failed to retrieve task conversations');
    }
  }

  /**
   * Get conversation statistics
   */
  private static async getConversationStats(conversationId: string): Promise<{
    totalQuestions: number;
    averageConfidence: number;
    duration: number;
    lastActivity: Date;
  }> {
    try {
      const stats = await AIQuestion.aggregate([
        {
          $match: { conversationId }
        },
        {
          $group: {
            _id: null,
            totalQuestions: { $sum: 1 },
            averageConfidence: { $avg: '$confidence' },
            firstQuestion: { $min: '$createdAt' },
            lastActivity: { $max: '$createdAt' }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          totalQuestions: 0,
          averageConfidence: 0,
          duration: 0,
          lastActivity: new Date()
        };
      }

      const stat = stats[0];
      const duration = stat.lastActivity.getTime() - stat.firstQuestion.getTime();

      return {
        totalQuestions: stat.totalQuestions,
        averageConfidence: Math.round(stat.averageConfidence * 100) / 100,
        duration: Math.round(duration / (1000 * 60)), // Duration in minutes
        lastActivity: stat.lastActivity
      };
    } catch (error) {
      logger.error('Error calculating conversation stats', { conversationId, error });
      return {
        totalQuestions: 0,
        averageConfidence: 0,
        duration: 0,
        lastActivity: new Date()
      };
    }
  }

  /**
   * Clean up old summaries to prevent database bloat
   */
  private static async cleanupOldSummaries(projectId: string, userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      // Keep only the 3 most recent summaries per project/user combination
      const summariesToKeep = await AISummary.find({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId
      })
      .sort({ generatedAt: -1 })
      .limit(3)
      .select('_id');

      const keepIds = summariesToKeep.map(s => s._id);

      await AISummary.deleteMany({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId,
        _id: { $nin: keepIds }
      });

      logger.debug('Cleaned up old summaries', { projectId, userId, kept: keepIds.length });
    } catch (error) {
      logger.error('Error cleaning up old summaries', { projectId, userId, error });
      // Don't throw error as this is cleanup operation
    }
  }
}
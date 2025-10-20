import { GeminiClient, createGeminiClient } from './geminiClient';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { logger } from '../utils/logger';

export interface ProjectSummary {
    projectId: string;
    summary: string;
    taskCount: number;
    statusBreakdown: Record<string, number>;
    generatedAt: Date;
    userId: string;
}

export interface AIResponse {
    taskId: string;
    question: string;
    answer: string;
    confidence: number;
    generatedAt: Date;
    userId: string;
    conversationId?: string;
}

export interface QuotaStatus {
    available: boolean;
    requestsRemaining: number;
    quotaLimit: number;
    resetTime?: Date;
}

export class AIService {
    private _geminiClient?: GeminiClient;

    constructor(geminiClient?: GeminiClient) {
        if (geminiClient) {
            this._geminiClient = geminiClient;
        }
    }

    private get geminiClient(): GeminiClient {
        if (!this._geminiClient) {
            this._geminiClient = createGeminiClient();
        }
        return this._geminiClient;
    }

    /**
     * Generate a comprehensive project summary
     */
    async generateProjectSummary(projectId: string, userId: string): Promise<ProjectSummary> {
        try {
            logger.info('Generating project summary', { projectId, userId });

            // Validate API configuration
            if (!this.geminiClient.isConfigured()) {
                throw new Error('Gemini API is not properly configured');
            }

            // Fetch project data with comprehensive aggregation
            const projectData = await this.aggregateProjectData(projectId, userId);

            // Prepare enhanced project context for AI
            const projectContext = this.prepareProjectContext(projectData);

            // Generate AI summary with enhanced prompt
            const prompt = this.createProjectSummaryPrompt(projectContext);
            let aiSummary = await this.geminiClient.generateContent(prompt, projectContext);

            // Ensure summary doesn't exceed database limit (5000 chars)
            if (aiSummary.length > 4500) {
                logger.warn('AI summary too long, truncating', {
                    originalLength: aiSummary.length,
                    projectId
                });
                aiSummary = aiSummary.substring(0, 4400) + '\n\n[Summary truncated due to length limit]';
            }

            const summary: ProjectSummary = {
                projectId,
                summary: aiSummary,
                taskCount: projectData.tasks.length,
                statusBreakdown: projectData.statusBreakdown,
                generatedAt: new Date(),
                userId
            };

            logger.info('Successfully generated project summary', {
                projectId,
                taskCount: projectData.tasks.length,
                summaryLength: aiSummary.length
            });

            return summary;
        } catch (error) {
            logger.error('Error generating project summary', {
                projectId,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Answer questions about a specific task with conversation history support
     */
    async answerTaskQuestion(
        taskId: string,
        question: string,
        userId: string,
        conversationId?: string
    ): Promise<AIResponse & { conversationId: string }> {
        try {
            logger.info('Answering task question', { taskId, userId, questionLength: question.length, conversationId });

            // Validate API configuration
            if (!this.geminiClient.isConfigured()) {
                throw new Error('Gemini API is not properly configured');
            }

            // Extract and validate task context
            const taskContext = await this.extractTaskContext(taskId, userId);

            // Get conversation history if conversationId is provided
            const conversationHistory = conversationId
                ? await this.getConversationHistory(conversationId, taskId)
                : [];

            // Process question with context and history
            const processedContext = await this.processQuestionContext(
                question,
                taskContext,
                conversationHistory
            );

            // Generate AI response with enhanced context
            const prompt = this.createEnhancedTaskQuestionPrompt(
                question,
                processedContext,
                conversationHistory
            );

            const aiAnswer = await this.geminiClient.generateContent(prompt, processedContext);

            // Ensure we have a valid response
            if (!aiAnswer || typeof aiAnswer !== 'string') {
                throw new Error('Invalid response from AI service');
            }

            // Validate and score the response
            const validatedResponse = this.validateAndScoreResponse(
                aiAnswer,
                processedContext,
                conversationHistory
            );

            // Generate or use existing conversation ID
            const finalConversationId = conversationId || this.generateConversationId(taskId, userId);

            const response: AIResponse & { conversationId: string } = {
                taskId,
                question,
                answer: validatedResponse.answer,
                confidence: validatedResponse.confidence,
                generatedAt: new Date(),
                userId,
                conversationId: finalConversationId
            };

            logger.info('Successfully answered task question', {
                taskId,
                userId,
                answerLength: validatedResponse.answer.length,
                confidence: validatedResponse.confidence,
                conversationId: finalConversationId,
                historyLength: conversationHistory.length
            });

            return response;
        } catch (error) {
            logger.error('Error answering task question', {
                taskId,
                userId,
                conversationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Validate API key and connection
     */
    async validateApiKey(): Promise<boolean> {
        try {
            return await this.geminiClient.validateConnection();
        } catch (error) {
            logger.error('Error validating API key', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Check quota status
     */
    async checkQuotaStatus(): Promise<QuotaStatus> {
        try {
            const stats = await this.geminiClient.getUsageStats();

            return {
                available: stats.quotaRemaining > 0,
                requestsRemaining: stats.quotaRemaining,
                quotaLimit: stats.quotaLimit,
                resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
            };
        } catch (error) {
            logger.error('Error checking quota status', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                available: false,
                requestsRemaining: 0,
                quotaLimit: 0
            };
        }
    }

    /**
     * Get service status
     */
    async getServiceStatus(): Promise<{
        configured: boolean;
        connected: boolean;
        quota: QuotaStatus;
    }> {
        logger.info('[AI Service] getServiceStatus called');

        try {
            logger.info('[AI Service] Checking if Gemini client is configured');
            const configured = this.geminiClient.isConfigured();
            logger.info('[AI Service] Configuration check result:', { configured });

            let connected = false;
            if (configured) {
                logger.info('[AI Service] Client is configured, validating API key');
                connected = await this.validateApiKey();
                logger.info('[AI Service] API key validation result:', { connected });
            } else {
                logger.warn('[AI Service] Client is not configured, skipping connection test');
            }

            logger.info('[AI Service] Checking quota status');
            const quota = await this.checkQuotaStatus();
            logger.info('[AI Service] Quota status:', quota);

            const result = {
                configured,
                connected,
                quota
            };

            logger.info('[AI Service] getServiceStatus completed:', result);
            return result;
        } catch (error) {
            logger.error('[AI Service] Error in getServiceStatus:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    /**
     * Aggregate comprehensive project data for AI analysis
     */
    private async aggregateProjectData(projectId: string, userId: string): Promise<{
        project: any;
        tasks: any[];
        statusBreakdown: Record<string, number>;
        priorityBreakdown: Record<string, number>;
        assignmentBreakdown: Record<string, number>;
        timelineAnalysis: {
            overdueTasks: number;
            upcomingTasks: number;
            tasksWithoutDueDate: number;
            averageTaskAge: number;
        };
        activityMetrics: {
            recentlyCreated: number;
            recentlyUpdated: number;
            staleTasksCount: number;
        };
        teamMetrics: {
            totalMembers: number;
            activeMembers: number;
            workloadDistribution: Record<string, number>;
        };
    }> {
        // Fetch project data
        const project = await Project.findById(projectId).populate('members', 'name email');
        if (!project) {
            throw new Error('Project not found');
        }

        // Check if user has access to the project
        const hasAccess = project.members.some((member: any) =>
            member._id.toString() === userId
        ) || project.owner.toString() === userId;

        if (!hasAccess) {
            throw new Error('User does not have access to this project');
        }

        // Fetch all tasks for the project with detailed population
        const tasks = await Task.find({ project: projectId })
            .populate('assignee', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        // Calculate status breakdown
        const statusBreakdown = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate priority breakdown
        const priorityBreakdown = tasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate assignment breakdown
        const assignmentBreakdown = tasks.reduce((acc, task) => {
            const assigneeName = task.assignee ? (task.assignee as any).name : 'Unassigned';
            acc[assigneeName] = (acc[assigneeName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Timeline analysis
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const overdueTasks = tasks.filter(task =>
            task.dueDate && task.dueDate < now && task.status !== 'done'
        ).length;

        const upcomingTasks = tasks.filter(task =>
            task.dueDate && task.dueDate > now && task.dueDate <= oneWeekFromNow
        ).length;

        const tasksWithoutDueDate = tasks.filter(task => !task.dueDate).length;

        const averageTaskAge = tasks.length > 0
            ? tasks.reduce((sum, task) => sum + (now.getTime() - task.createdAt.getTime()), 0) / tasks.length / (24 * 60 * 60 * 1000)
            : 0;

        // Activity metrics
        const recentlyCreated = tasks.filter(task => task.createdAt >= oneWeekAgo).length;
        const recentlyUpdated = tasks.filter(task => task.updatedAt >= oneWeekAgo && task.updatedAt !== task.createdAt).length;
        const staleTasksCount = tasks.filter(task =>
            task.updatedAt < thirtyDaysAgo && task.status !== 'done'
        ).length;

        // Team metrics
        const assignedTasks = tasks.filter(task => task.assignee);
        const uniqueAssignees = new Set(assignedTasks.map(task => (task.assignee as any)?._id?.toString()));
        const activeMembers = uniqueAssignees.size;

        const workloadDistribution = assignedTasks.reduce((acc, task) => {
            const assigneeId = (task.assignee as any)?._id?.toString();
            if (assigneeId) {
                acc[assigneeId] = (acc[assigneeId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return {
            project,
            tasks,
            statusBreakdown,
            priorityBreakdown,
            assignmentBreakdown,
            timelineAnalysis: {
                overdueTasks,
                upcomingTasks,
                tasksWithoutDueDate,
                averageTaskAge: Math.round(averageTaskAge * 10) / 10
            },
            activityMetrics: {
                recentlyCreated,
                recentlyUpdated,
                staleTasksCount
            },
            teamMetrics: {
                totalMembers: project.members.length,
                activeMembers,
                workloadDistribution
            }
        };
    }

    /**
     * Prepare enhanced project context for AI analysis
     */
    private prepareProjectContext(projectData: any): any {
        const {
            project,
            tasks,
            statusBreakdown,
            priorityBreakdown,
            assignmentBreakdown,
            timelineAnalysis,
            activityMetrics,
            teamMetrics
        } = projectData;

        // Prepare task summaries with key insights
        const taskSummaries = tasks.slice(0, 20).map((task: any, index: number) => ({
            id: index + 1,
            title: task.title,
            description: task.description ? task.description.substring(0, 200) + (task.description.length > 200 ? '...' : '') : 'No description',
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignee ? (task.assignee as any).name : 'Unassigned',
            dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'No due date',
            isOverdue: task.dueDate && task.dueDate < new Date() && task.status !== 'done',
            daysSinceCreated: Math.floor((new Date().getTime() - task.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
            daysSinceUpdated: Math.floor((new Date().getTime() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
        }));

        // Identify key insights
        const insights = {
            hasOverdueTasks: timelineAnalysis.overdueTasks > 0,
            hasUpcomingDeadlines: timelineAnalysis.upcomingTasks > 0,
            hasUnassignedTasks: assignmentBreakdown['Unassigned'] > 0,
            hasHighPriorityTasks: priorityBreakdown['high'] > 0,
            hasStaleContent: activityMetrics.staleTasksCount > 0,
            workloadImbalance: this.detectWorkloadImbalance(teamMetrics.workloadDistribution),
            progressStalled: statusBreakdown['inprogress'] > statusBreakdown['done'] && activityMetrics.recentlyUpdated < 3
        };

        return {
            project: {
                name: project.name,
                description: project.description || 'No description provided',
                memberCount: project.members.length,
                createdAt: project.createdAt
            },
            metrics: {
                totalTasks: tasks.length,
                statusBreakdown,
                priorityBreakdown,
                assignmentBreakdown,
                timelineAnalysis,
                activityMetrics,
                teamMetrics
            },
            taskSummaries,
            insights,
            analysisTimestamp: new Date().toISOString()
        };
    }

    /**
     * Detect workload imbalance among team members
     */
    private detectWorkloadImbalance(workloadDistribution: Record<string, number>): boolean {
        const workloads = Object.values(workloadDistribution);
        if (workloads.length < 2) return false;

        const max = Math.max(...workloads);
        const min = Math.min(...workloads);
        const average = workloads.reduce((sum, count) => sum + count, 0) / workloads.length;

        // Consider imbalanced if max is more than 2x the average or if difference between max and min is > 5
        return max > average * 2 || (max - min) > 5;
    }

    /**
     * Create enhanced prompt for project summary generation
     */
    private createProjectSummaryPrompt(projectContext: any): string {
        const { project, metrics, taskSummaries, insights } = projectContext;

        return `
You are an expert project management AI assistant. Analyze this project data and provide a concise, actionable summary.

**CRITICAL: Your response must be under 4500 characters total. Be concise and focus on the most important insights.**

## PROJECT: ${project.name}
**Team:** ${project.memberCount} members | **Tasks:** ${metrics.totalTasks} total
**Status:** ${metrics.statusBreakdown.done || 0} done, ${metrics.statusBreakdown.inprogress || 0} in progress, ${metrics.statusBreakdown.todo || 0} to do
**Priority:** ${metrics.priorityBreakdown.high || 0} high, ${metrics.priorityBreakdown.medium || 0} medium, ${metrics.priorityBreakdown.low || 0} low
**Timeline:** ${metrics.timelineAnalysis.overdueTasks} overdue, ${metrics.timelineAnalysis.upcomingTasks} due soon

## TOP TASKS
${taskSummaries.slice(0, 5).map((task: any) => `
${task.id}. ${task.title} [${task.status.toUpperCase()}] - ${task.assignedTo}${task.isOverdue ? ' ⚠️ OVERDUE' : ''}
`).join('')}

## ANALYSIS (Keep each section brief - 2-3 bullet points max)

### 🎯 PROJECT HEALTH
- Overall status and progress velocity
- Key strengths and concerns

### 📊 CRITICAL INSIGHTS  
- Most important patterns and findings
- Resource allocation effectiveness

### ⚠️ IMMEDIATE ACTIONS
${insights.hasOverdueTasks ? '- Address overdue tasks' : ''}
${insights.hasUpcomingDeadlines ? '- Prepare for upcoming deadlines' : ''}
${insights.hasUnassignedTasks ? '- Assign unassigned tasks' : ''}
${insights.hasHighPriorityTasks ? '- Focus on high-priority items' : ''}
${insights.hasStaleContent ? '- Review stale tasks' : ''}
${insights.workloadImbalance ? '- Rebalance workload' : ''}

### 🚀 NEXT STEPS
- Top 3 actionable recommendations with timelines

### 📈 SUCCESS METRICS
- Key indicators to monitor

**Remember: Keep total response under 4500 characters. Be concise and actionable.**
    `.trim();
    }



    /**
     * Extract comprehensive task context for AI processing
     */
    private async extractTaskContext(taskId: string, userId: string): Promise<any> {
        // Fetch task data with comprehensive population
        const task = await Task.findById(taskId)
            .populate('assignee', 'name email avatar')
            .populate('project', 'name description members owner')
            .populate('createdBy', 'name email');

        if (!task) {
            throw new Error('Task not found');
        }

        // Check if user has access to the task's project
        const project = task.project as any;
        if (!project) {
            throw new Error('Project not found');
        }

        const hasAccess = project.members.some((member: any) =>
            member._id.toString() === userId
        ) || project.owner.toString() === userId;

        if (!hasAccess) {
            throw new Error('User does not have access to this task');
        }

        // Get related tasks for additional context
        const relatedTasks = await Task.find({
            project: task.project,
            _id: { $ne: taskId }
        })
            .populate('assignee', 'name')
            .sort({ updatedAt: -1 })
            .limit(5);

        // Calculate task metrics
        const taskAge = Math.floor((new Date().getTime() - task.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        const daysSinceUpdate = Math.floor((new Date().getTime() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
        const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'done';

        return {
            task: {
                id: task._id,
                title: task.title,
                description: task.description || 'No description provided',
                status: task.status,
                priority: task.priority,
                assignedTo: task.assignee ? (task.assignee as any).name : 'Unassigned',
                assigneeEmail: task.assignee ? (task.assignee as any).email : null,
                dueDate: task.dueDate,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                createdBy: task.createdBy ? (task.createdBy as any).name : 'Unknown',
                taskAge,
                daysSinceUpdate,
                isOverdue
            },
            project: {
                id: project._id,
                name: project.name,
                description: project.description || 'No description provided',
                memberCount: project.members.length,
                totalTasks: await Task.countDocuments({ project: task.project })
            },
            relatedTasks: relatedTasks.map(t => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                assignedTo: t.assignee ? (t.assignee as any).name : 'Unassigned'
            })),
            contextMetadata: {
                extractedAt: new Date(),
                userId,
                hasRelatedTasks: relatedTasks.length > 0
            }
        };
    }

    /**
     * Get conversation history for follow-up questions
     */
    private async getConversationHistory(conversationId: string, taskId: string): Promise<any[]> {
        try {
            const { AIQuestion } = await import('../models/AIQuestion');

            const history = await AIQuestion.find({
                conversationId,
                taskId: new (await import('mongoose')).Types.ObjectId(taskId)
            })
                .sort({ createdAt: 1 })
                .limit(10) // Limit to last 10 exchanges to manage context size
                .select('question answer confidence createdAt');

            return history.map(item => ({
                question: item.question || '',
                answer: item.answer || '',
                confidence: item.confidence || 0,
                timestamp: item.createdAt
            }));
        } catch (error) {
            logger.warn('Error fetching conversation history', { conversationId, taskId, error });
            return [];
        }
    }

    /**
     * Process question context with task details and conversation history
     */
    private async processQuestionContext(
        question: string,
        taskContext: any,
        conversationHistory: any[]
    ): Promise<any> {
        // Analyze question type and intent
        const questionType = this.analyzeQuestionType(question);
        const questionIntent = this.extractQuestionIntent(question, taskContext);

        // Determine relevant context based on question
        const relevantContext = this.selectRelevantContext(questionType, taskContext);

        // Process conversation history for context
        const conversationSummary = this.summarizeConversationHistory(conversationHistory);

        return {
            ...relevantContext,
            questionAnalysis: {
                type: questionType,
                intent: questionIntent,
                requiresHistory: conversationHistory.length > 0,
                isFollowUp: this.isFollowUpQuestion(question, conversationHistory)
            },
            conversationContext: {
                hasHistory: conversationHistory.length > 0,
                historyLength: conversationHistory.length,
                summary: conversationSummary,
                lastQuestion: conversationHistory.length > 0
                    ? conversationHistory[conversationHistory.length - 1].question
                    : null
            }
        };
    }

    /**
     * Create enhanced prompt for task questions with conversation context
     */
    private createEnhancedTaskQuestionPrompt(
        question: string,
        processedContext: any,
        conversationHistory: any[]
    ): string {
        const { task, project, relatedTasks, questionAnalysis, conversationContext } = processedContext;

        let prompt = `
You are an AI assistant helping users understand tasks in a collaborative task management system.

## CURRENT QUESTION
"${question}"

## TASK DETAILS
**Title:** ${task.title}
**Description:** ${task.description}
**Status:** ${task.status} | **Priority:** ${task.priority}
**Assigned to:** ${task.assignedTo}
**Due Date:** ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
**Project:** ${project.name}
**Task Age:** ${task.taskAge} days | **Last Updated:** ${task.daysSinceUpdate} days ago
${task.isOverdue ? '⚠️ **This task is OVERDUE**' : ''}

## PROJECT CONTEXT
**Project:** ${project.name}
**Description:** ${project.description}
**Team Size:** ${project.memberCount} members
**Total Tasks:** ${project.totalTasks}

## QUESTION ANALYSIS
**Type:** ${questionAnalysis.type}
**Intent:** ${questionAnalysis.intent}
${questionAnalysis.isFollowUp ? '**This appears to be a follow-up question**' : ''}
`;

        // Add conversation history if available
        if (conversationContext.hasHistory) {
            prompt += `
## CONVERSATION HISTORY
${conversationContext.summary}

**Previous Questions & Answers:**
${conversationHistory.slice(-3).map((item, index) => {
  const question = item.question || 'No question';
  const answer = item.answer || 'No answer';
  const confidence = item.confidence || 0;
  
  return `
${index + 1}. **Q:** ${question}
   **A:** ${answer.substring(0, 200)}${answer.length > 200 ? '...' : ''}
   **Confidence:** ${(confidence * 100).toFixed(0)}%
`;
}).join('')}
`;
        }

        // Add related tasks context if relevant
        if (relatedTasks.length > 0 && (questionAnalysis.type === 'comparison' || questionAnalysis.type === 'context')) {
            prompt += `
## RELATED TASKS IN PROJECT
${relatedTasks.map((t: any, index: number) => `
${index + 1}. **${t.title}** [${t.status.toUpperCase()}] - ${t.priority} priority - ${t.assignedTo}
`).join('')}
`;
        }

        prompt += `
## RESPONSE GUIDELINES
- Provide a helpful, accurate answer based on the task and project information
- Reference specific task details when relevant
- If this is a follow-up question, acknowledge the conversation history
- If the question cannot be fully answered with available information, clearly state what additional information would be needed
- Keep responses concise but informative (aim for 100-300 words)
- Focus on being practical and actionable
- Use a professional but friendly tone

${questionAnalysis.isFollowUp ? '- Build upon the previous conversation context' : ''}
${task.isOverdue ? '- Consider the overdue status in your response' : ''}
`;

        return prompt.trim();
    }

    /**
     * Validate and score AI response quality
     */
    private validateAndScoreResponse(
        answer: string,
        processedContext: any,
        conversationHistory: any[]
    ): { answer: string; confidence: number } {
        let confidence = 0.5; // Base confidence
        
        // Ensure answer is valid
        if (!answer || typeof answer !== 'string') {
            return {
                answer: 'I apologize, but I was unable to generate a proper response. Please try asking your question again.',
                confidence: 0.1
            };
        }
        
        let validatedAnswer = answer.trim();

        // Validate answer quality
        if (validatedAnswer.length < 20) {
            confidence -= 0.3;
            validatedAnswer += "\n\n*Note: This response may be incomplete. Please ask a more specific question for better assistance.*";
        }

        if (validatedAnswer.length > 2000) {
            confidence -= 0.1;
            // Truncate if too long
            validatedAnswer = validatedAnswer.substring(0, 1800) + "\n\n*[Response truncated for brevity]*";
        }

        // Score based on context relevance
        const contextScore = this.calculateContextRelevanceScore(validatedAnswer, processedContext);
        confidence += contextScore * 0.3;

        // Score based on question type handling
        const questionTypeScore = this.calculateQuestionTypeScore(
            validatedAnswer,
            processedContext.questionAnalysis
        );
        confidence += questionTypeScore * 0.2;

        // Score based on conversation continuity (if applicable)
        if (conversationHistory.length > 0) {
            const continuityScore = this.calculateConversationContinuityScore(
                validatedAnswer,
                conversationHistory
            );
            confidence += continuityScore * 0.2;
        }

        // Ensure confidence is between 0 and 1
        confidence = Math.max(0.1, Math.min(1, confidence));

        return {
            answer: validatedAnswer,
            confidence: Math.round(confidence * 100) / 100 // Round to 2 decimal places
        };
    }

    /**
     * Generate unique conversation ID
     */
    private generateConversationId(taskId: string, userId: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `conv_${taskId}_${userId}_${timestamp}_${random}`;
    }

    /**
     * Analyze question type for better context selection
     */
    private analyzeQuestionType(question: string): string {
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('what') || lowerQuestion.includes('describe')) {
            return 'descriptive';
        } else if (lowerQuestion.includes('how') || lowerQuestion.includes('steps')) {
            return 'procedural';
        } else if (lowerQuestion.includes('why') || lowerQuestion.includes('reason')) {
            return 'explanatory';
        } else if (lowerQuestion.includes('when') || lowerQuestion.includes('deadline')) {
            return 'temporal';
        } else if (lowerQuestion.includes('who') || lowerQuestion.includes('assigned')) {
            return 'assignment';
        } else if (lowerQuestion.includes('compare') || lowerQuestion.includes('difference')) {
            return 'comparison';
        } else if (lowerQuestion.includes('status') || lowerQuestion.includes('progress')) {
            return 'status';
        } else {
            return 'general';
        }
    }

    /**
     * Extract question intent from context
     */
    private extractQuestionIntent(question: string, taskContext: any): string {
        const lowerQuestion = question.toLowerCase();
        const { task } = taskContext;

        if (lowerQuestion.includes(task.title.toLowerCase())) {
            return 'task-specific';
        } else if (lowerQuestion.includes('project') || lowerQuestion.includes(taskContext.project.name.toLowerCase())) {
            return 'project-related';
        } else if (lowerQuestion.includes('team') || lowerQuestion.includes('member')) {
            return 'team-related';
        } else if (lowerQuestion.includes('deadline') || lowerQuestion.includes('due')) {
            return 'timeline-related';
        } else {
            return 'general-inquiry';
        }
    }

    /**
     * Select relevant context based on question type
     */
    private selectRelevantContext(questionType: string, taskContext: any): any {
        const baseContext = {
            task: taskContext.task,
            project: taskContext.project
        };

        switch (questionType) {
            case 'comparison':
            case 'context':
                return {
                    ...baseContext,
                    relatedTasks: taskContext.relatedTasks
                };
            case 'temporal':
            case 'status':
                return {
                    ...baseContext,
                    timeline: {
                        taskAge: taskContext.task.taskAge,
                        daysSinceUpdate: taskContext.task.daysSinceUpdate,
                        isOverdue: taskContext.task.isOverdue
                    }
                };
            default:
                return baseContext;
        }
    }

    /**
     * Summarize conversation history for context
     */
    private summarizeConversationHistory(conversationHistory: any[]): string {
        if (conversationHistory.length === 0) {
            return 'No previous conversation';
        }

        const topics = conversationHistory.map(item => {
            const question = item.question.toLowerCase();
            if (question.includes('status')) return 'status';
            if (question.includes('deadline') || question.includes('due')) return 'timeline';
            if (question.includes('assign')) return 'assignment';
            if (question.includes('priority')) return 'priority';
            return 'general';
        });

        const uniqueTopics = [...new Set(topics)];
        return `Previous conversation covered: ${uniqueTopics.join(', ')} (${conversationHistory.length} exchanges)`;
    }

    /**
     * Check if current question is a follow-up
     */
    private isFollowUpQuestion(question: string, conversationHistory: any[]): boolean {
        if (conversationHistory.length === 0) return false;

        const lowerQuestion = question.toLowerCase();
        const followUpIndicators = [
            'also', 'additionally', 'furthermore', 'what about', 'how about',
            'can you', 'could you', 'and', 'but', 'however', 'though'
        ];

        return followUpIndicators.some(indicator => lowerQuestion.includes(indicator));
    }

    /**
     * Calculate context relevance score
     */
    private calculateContextRelevanceScore(answer: string, processedContext: any): number {
        const lowerAnswer = answer.toLowerCase();
        const { task, project } = processedContext;
        let score = 0;

        // Check if answer references task details
        if (lowerAnswer.includes(task.title.toLowerCase())) score += 0.3;
        if (lowerAnswer.includes(task.status.toLowerCase())) score += 0.2;
        if (lowerAnswer.includes(task.priority.toLowerCase())) score += 0.2;
        if (lowerAnswer.includes(project.name.toLowerCase())) score += 0.2;
        if (task.assignedTo !== 'Unassigned' && lowerAnswer.includes(task.assignedTo.toLowerCase())) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Calculate question type handling score
     */
    private calculateQuestionTypeScore(answer: string, questionAnalysis: any): number {
        const lowerAnswer = answer.toLowerCase();
        let score = 0.5; // Base score

        // Check if answer appropriately addresses question type
        switch (questionAnalysis.type) {
            case 'descriptive':
                if (lowerAnswer.includes('is') || lowerAnswer.includes('description')) score += 0.3;
                break;
            case 'procedural':
                if (lowerAnswer.includes('step') || lowerAnswer.includes('process')) score += 0.3;
                break;
            case 'temporal':
                if (lowerAnswer.includes('date') || lowerAnswer.includes('deadline')) score += 0.3;
                break;
            case 'status':
                if (lowerAnswer.includes('status') || lowerAnswer.includes('progress')) score += 0.3;
                break;
        }

        return Math.min(1, score);
    }

    /**
     * Calculate conversation continuity score
     */
    private calculateConversationContinuityScore(answer: string, conversationHistory: any[]): number {
        if (conversationHistory.length === 0) return 0.5;

        const lowerAnswer = answer.toLowerCase();
        let score = 0.5;

        // Check if answer acknowledges previous context
        const continuityWords = ['previously', 'earlier', 'as mentioned', 'following up', 'additionally'];
        if (continuityWords.some(word => lowerAnswer.includes(word))) {
            score += 0.3;
        }

        // Check if answer builds on previous topics
        const lastQuestion = conversationHistory[conversationHistory.length - 1];
        if (lastQuestion && lastQuestion.answer) {
            const commonWords = this.findCommonWords(answer, lastQuestion.answer);
            if (commonWords && commonWords.length > 2) {
                score += 0.2;
            }
        }

        return Math.min(1, score);
    }

    /**
     * Find common words between two texts
     */
    private findCommonWords(text1: string, text2: string): string[] {
        if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') {
            return [];
        }
        
        const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 3);

        return words1.filter(word => words2.includes(word));
    }


}

// Export singleton instance
export const aiService = new AIService();
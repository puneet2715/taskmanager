// Export all models and their interfaces
export { User, IUser } from './User';
export { Project, IProject } from './Project';
export { Task, ITask, TaskStatus, TaskPriority } from './Task';
export { ActivityLog, IActivityLog, ActivityAction, EntityType } from './ActivityLog';
export { AISummary, IAISummary } from './AISummary';
export { AIQuestion, IAIQuestion } from './AIQuestion';

// Re-export mongoose types for convenience
export { Types as MongooseTypes } from 'mongoose';
import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction = 'created' | 'updated' | 'deleted' | 'moved';
export type EntityType = 'task' | 'project';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: ActivityAction;
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  changes?: Record<string, any>;
  timestamp: Date;
  
  // Instance methods
  getFormattedMessage(): string;
}

const activityLogSchema = new Schema<IActivityLog>({
  action: {
    type: String,
    enum: {
      values: ['created', 'updated', 'deleted', 'moved'],
      message: 'Action must be one of: created, updated, deleted, moved'
    },
    required: [true, 'Action is required']
  },
  entityType: {
    type: String,
    enum: {
      values: ['task', 'project'],
      message: 'Entity type must be one of: task, project'
    },
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  changes: {
    type: Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false, // We're using our own timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
activityLogSchema.index({ project: 1, timestamp: -1 });
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

// TTL index to automatically delete old logs after 90 days
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Instance method to get formatted message
activityLogSchema.methods['getFormattedMessage'] = function(): string {
  const log = this as any;
  const actionMessages = {
    created: `created a new ${log.entityType}`,
    updated: `updated a ${log.entityType}`,
    deleted: `deleted a ${log.entityType}`,
    moved: `moved a ${log.entityType}`
  };
  
  return actionMessages[log.action as keyof typeof actionMessages] || `performed ${log.action} on ${log.entityType}`;
};

// Static method to log activity
activityLogSchema.statics['logActivity'] = async function(
  action: ActivityAction,
  entityType: EntityType,
  entityId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  projectId: mongoose.Types.ObjectId,
  changes?: Record<string, any>
) {
  return await this.create({
    action,
    entityType,
    entityId,
    user: userId,
    project: projectId,
    changes,
    timestamp: new Date()
  });
};

// Static method to get project activity
activityLogSchema.statics['getProjectActivity'] = function(
  projectId: mongoose.Types.ObjectId,
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ project: projectId })
    .populate('user', 'name email avatar')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user activity
activityLogSchema.statics['getUserActivity'] = function(
  userId: mongoose.Types.ObjectId,
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ user: userId })
    .populate('project', 'name')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get recent activity across all projects for a user
activityLogSchema.statics['getRecentActivity'] = function(
  userProjects: mongoose.Types.ObjectId[],
  limit: number = 20
) {
  return this.find({ project: { $in: userProjects } })
    .populate('user', 'name email avatar')
    .populate('project', 'name')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to clean up old logs (manual cleanup if needed)
activityLogSchema.statics['cleanupOldLogs'] = function(daysOld: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
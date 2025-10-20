import mongoose, { Document, Schema } from 'mongoose';

export interface IAISummary extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  summary: string;
  taskCount: number;
  statusBreakdown: {
    todo: number;
    inprogress: number;
    done: number;
  };
  generatedAt: Date;
  expiresAt: Date;
  
  // Instance methods
  isExpired(): boolean;
  refreshExpiration(): Promise<IAISummary>;
}

const aiSummarySchema = new Schema<IAISummary>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  summary: {
    type: String,
    required: [true, 'Summary content is required'],
    trim: true,
    minlength: [10, 'Summary must be at least 10 characters long'],
    maxlength: [5000, 'Summary cannot exceed 5000 characters']
  },
  taskCount: {
    type: Number,
    required: [true, 'Task count is required'],
    min: [0, 'Task count must be non-negative']
  },
  statusBreakdown: {
    todo: {
      type: Number,
      required: [true, 'Todo count is required'],
      min: [0, 'Todo count must be non-negative'],
      default: 0
    },
    inprogress: {
      type: Number,
      required: [true, 'In progress count is required'],
      min: [0, 'In progress count must be non-negative'],
      default: 0
    },
    done: {
      type: Number,
      required: [true, 'Done count is required'],
      min: [0, 'Done count must be non-negative'],
      default: 0
    }
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    required: [true, 'Generated at timestamp is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration timestamp is required']
  }
}, {
  timestamps: false, // We handle timestamps manually with generatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
aiSummarySchema.index({ projectId: 1, generatedAt: -1 });
aiSummarySchema.index({ userId: 1, generatedAt: -1 });
aiSummarySchema.index({ projectId: 1, userId: 1, generatedAt: -1 });
aiSummarySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Validation for status breakdown consistency
aiSummarySchema.pre('validate', function(next) {
  const summary = this as any;
  const totalFromBreakdown = summary.statusBreakdown.todo + 
                           summary.statusBreakdown.inprogress + 
                           summary.statusBreakdown.done;
  
  if (totalFromBreakdown !== summary.taskCount) {
    return next(new Error('Status breakdown must sum to total task count'));
  }
  next();
});

// Pre-save middleware to set expiration if not provided
aiSummarySchema.pre('save', function(next) {
  const summary = this as any;
  if (summary.isNew && !summary.expiresAt) {
    // Default expiration: 1 hour from generation
    const expirationTime = new Date(summary.generatedAt);
    expirationTime.setHours(expirationTime.getHours() + 1);
    summary.expiresAt = expirationTime;
  }
  next();
});

// Instance method to check if summary is expired
aiSummarySchema.methods['isExpired'] = function(): boolean {
  const summary = this as any;
  return summary.expiresAt < new Date();
};

// Instance method to refresh expiration
aiSummarySchema.methods['refreshExpiration'] = async function(): Promise<IAISummary> {
  const summary = this as any;
  const newExpiration = new Date();
  newExpiration.setHours(newExpiration.getHours() + 1);
  summary.expiresAt = newExpiration;
  return await summary.save();
};

// Static method to find latest summary for project
aiSummarySchema.statics['findLatestForProject'] = function(projectId: mongoose.Types.ObjectId, userId?: mongoose.Types.ObjectId) {
  const query: any = { 
    projectId,
    expiresAt: { $gt: new Date() } // Only non-expired summaries
  };
  
  if (userId) {
    query.userId = userId;
  }
  
  return this.findOne(query)
    .populate('projectId', 'name')
    .populate('userId', 'name email')
    .sort({ generatedAt: -1 });
};

// Static method to find summaries by user
aiSummarySchema.statics['findByUser'] = function(userId: mongoose.Types.ObjectId, limit: number = 10) {
  return this.find({ 
    userId,
    expiresAt: { $gt: new Date() }
  })
    .populate('projectId', 'name')
    .sort({ generatedAt: -1 })
    .limit(limit);
};

// Static method to cleanup expired summaries (manual cleanup if needed)
aiSummarySchema.statics['cleanupExpired'] = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

export const AISummary = mongoose.model<IAISummary>('AISummary', aiSummarySchema);
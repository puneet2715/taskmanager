import mongoose, { Document, Schema } from 'mongoose';

export interface IAIQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  confidence: number;
  context: {
    taskTitle: string;
    taskDescription?: string;
    projectName: string;
    projectId: mongoose.Types.ObjectId;
  };
  conversationId?: string; // For grouping related questions
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isHighConfidence(): boolean;
  getConversationHistory(): Promise<IAIQuestion[]>;
}

const aiQuestionSchema = new Schema<IAIQuestion>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task ID is required']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    minlength: [3, 'Question must be at least 3 characters long'],
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    minlength: [1, 'Answer must not be empty'],
    maxlength: [5000, 'Answer cannot exceed 5000 characters']
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence score is required'],
    min: [0, 'Confidence must be between 0 and 1'],
    max: [1, 'Confidence must be between 0 and 1'],
    default: 0.5
  },
  context: {
    taskTitle: {
      type: String,
      required: [true, 'Task title context is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters']
    },
    taskDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Task description cannot exceed 1000 characters'],
      default: null
    },
    projectName: {
      type: String,
      required: [true, 'Project name context is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID context is required']
    }
  },
  conversationId: {
    type: String,
    trim: true,
    maxlength: [100, 'Conversation ID cannot exceed 100 characters'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
aiQuestionSchema.index({ taskId: 1, createdAt: -1 });
aiQuestionSchema.index({ userId: 1, createdAt: -1 });
aiQuestionSchema.index({ 'context.projectId': 1, createdAt: -1 });
aiQuestionSchema.index({ conversationId: 1, createdAt: 1 }); // For conversation history
aiQuestionSchema.index({ taskId: 1, userId: 1, createdAt: -1 });

// Text index for searching questions and answers
aiQuestionSchema.index({ 
  question: 'text', 
  answer: 'text',
  'context.taskTitle': 'text'
}, {
  weights: {
    question: 10,
    'context.taskTitle': 5,
    answer: 1
  },
  name: 'ai_question_text_index'
});

// Pre-save middleware to generate conversation ID if not provided
aiQuestionSchema.pre('save', function(next) {
  const question = this as any;
  if (question.isNew && !question.conversationId) {
    // Generate conversation ID based on task and user
    question.conversationId = `${question.taskId}_${question.userId}_${Date.now()}`;
  }
  next();
});

// Instance method to check if answer has high confidence
aiQuestionSchema.methods['isHighConfidence'] = function(): boolean {
  const question = this as any;
  return question.confidence >= 0.8;
};

// Instance method to get conversation history
aiQuestionSchema.methods['getConversationHistory'] = async function(): Promise<IAIQuestion[]> {
  const question = this as any;
  const AIQuestion = question.constructor as mongoose.Model<IAIQuestion>;
  
  if (!question.conversationId) {
    return [question];
  }
  
  return await AIQuestion.find({
    conversationId: question.conversationId
  })
    .populate('taskId', 'title description status')
    .populate('userId', 'name email')
    .sort({ createdAt: 1 });
};

// Static method to find questions by task
aiQuestionSchema.statics['findByTask'] = function(taskId: mongoose.Types.ObjectId, limit: number = 20) {
  return this.find({ taskId })
    .populate('userId', 'name email avatar')
    .populate('taskId', 'title description status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find questions by user
aiQuestionSchema.statics['findByUser'] = function(userId: mongoose.Types.ObjectId, limit: number = 50) {
  return this.find({ userId })
    .populate('taskId', 'title description status')
    .populate('context.projectId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find questions by project
aiQuestionSchema.statics['findByProject'] = function(projectId: mongoose.Types.ObjectId, limit: number = 100) {
  return this.find({ 'context.projectId': projectId })
    .populate('userId', 'name email avatar')
    .populate('taskId', 'title description status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search questions
aiQuestionSchema.statics['searchQuestions'] = function(searchTerm: string, projectId?: mongoose.Types.ObjectId, limit: number = 20) {
  const query: any = {
    $text: { $search: searchTerm }
  };
  
  if (projectId) {
    query['context.projectId'] = projectId;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('userId', 'name email avatar')
    .populate('taskId', 'title description status')
    .populate('context.projectId', 'name')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit);
};

// Static method to get conversation by ID
aiQuestionSchema.statics['findConversation'] = function(conversationId: string) {
  return this.find({ conversationId })
    .populate('userId', 'name email avatar')
    .populate('taskId', 'title description status')
    .sort({ createdAt: 1 });
};

// Static method to get recent questions with high confidence
aiQuestionSchema.statics['findHighConfidenceRecent'] = function(days: number = 7, limit: number = 50) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    confidence: { $gte: 0.8 },
    createdAt: { $gte: cutoffDate }
  })
    .populate('userId', 'name email avatar')
    .populate('taskId', 'title description status')
    .populate('context.projectId', 'name')
    .sort({ confidence: -1, createdAt: -1 })
    .limit(limit);
};

export const AIQuestion = mongoose.model<IAIQuestion>('AIQuestion', aiQuestionSchema);
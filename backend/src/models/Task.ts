import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  position: number;
  dueDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updatePosition(newPosition: number): Promise<ITask>;
  changeStatus(newStatus: TaskStatus, newPosition?: number): Promise<ITask>;
  isOverdue(): boolean;
}

const taskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [2, 'Task title must be at least 2 characters long'],
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['todo', 'inprogress', 'done'],
      message: 'Status must be one of: todo, inprogress, done'
    },
    default: 'todo'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be one of: low, medium, high'
    },
    default: 'medium'
  },
  assignee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  position: {
    type: Number,
    required: [true, 'Position is required'],
    min: [0, 'Position must be a non-negative number']
  },
  dueDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
taskSchema.index({ project: 1, status: 1, position: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });

// Virtual to check if task is overdue (removed to avoid conflict with method)

// Instance method to check if task is overdue
taskSchema.methods['isOverdue'] = function(): boolean {
  const task = this as any;
  return task.dueDate && task.dueDate < new Date() && task.status !== 'done';
};

// Instance method to update position
taskSchema.methods['updatePosition'] = async function(newPosition: number): Promise<ITask> {
  const task = this as any;
  const Task = task.constructor as mongoose.Model<ITask>;
  
  // Get tasks in the same project and status
  const tasksInColumn = await Task.find({
    project: task.project,
    status: task.status,
    _id: { $ne: task._id }
  }).sort({ position: 1 });

  // Update positions of other tasks
  for (let i = 0; i < tasksInColumn.length; i++) {
    const otherTask = tasksInColumn[i] as any;
    if (i >= newPosition) {
      otherTask.position = i + 1;
      await otherTask.save();
    } else {
      otherTask.position = i;
      await otherTask.save();
    }
  }

  // Update this task's position
  task.position = newPosition;
  return await task.save();
};

// Instance method to change status
taskSchema.methods['changeStatus'] = async function(newStatus: TaskStatus, newPosition?: number): Promise<ITask> {
  const task = this as any;
  const Task = task.constructor as mongoose.Model<ITask>;
  
  if (task.status === newStatus && newPosition === undefined) {
    return task; // No change needed
  }

  const oldStatus = task.status;
  
  // If changing status, we need to reorder tasks in both columns
  if (oldStatus !== newStatus) {
    // Remove from old column by updating positions
    const tasksInOldColumn = await Task.find({
      project: task.project,
      status: oldStatus,
      position: { $gt: task.position }
    });
    
    for (const otherTask of tasksInOldColumn) {
      (otherTask as any).position -= 1;
      await (otherTask as any).save();
    }
    
    // Add to new column
    const tasksInNewColumn = await Task.find({
      project: task.project,
      status: newStatus
    }).sort({ position: 1 });
    
    const targetPosition = newPosition !== undefined ? newPosition : tasksInNewColumn.length;
    
    // Update positions in new column
    for (let i = targetPosition; i < tasksInNewColumn.length; i++) {
      (tasksInNewColumn[i] as any).position = i + 1;
      await (tasksInNewColumn[i] as any).save();
    }
    
    task.status = newStatus;
    task.position = targetPosition;
  } else if (newPosition !== undefined) {
    // Just changing position within same status
    await task.updatePosition(newPosition);
  }
  
  return await task.save();
};

// Pre-validate middleware to handle position assignment
taskSchema.pre('validate', async function(next) {
  const task = this as any;
  if (task.isNew && (task.position === undefined || task.position === null)) {
    // For new tasks, set position to end of column if not specified
    const Task = task.constructor as mongoose.Model<ITask>;
    try {
      const maxPosition = await Task.findOne({
        project: task.project,
        status: task.status
      }).sort({ position: -1 }).select('position');
      
      task.position = maxPosition ? (maxPosition as any).position + 1 : 0;
    } catch (error) {
      task.position = 0; // Fallback to 0 if there's an error
    }
  }
  next();
});

// Static method to find tasks by project
taskSchema.statics['findByProject'] = function(projectId: mongoose.Types.ObjectId) {
  return this.find({ project: projectId })
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ status: 1, position: 1 });
};

// Static method to find tasks by assignee
taskSchema.statics['findByAssignee'] = function(userId: mongoose.Types.ObjectId) {
  return this.find({ assignee: userId })
    .populate('project', 'name')
    .populate('createdBy', 'name email avatar')
    .sort({ dueDate: 1, createdAt: -1 });
};

// Static method to find overdue tasks
taskSchema.statics['findOverdue'] = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'done' }
  })
    .populate('assignee', 'name email avatar')
    .populate('project', 'name')
    .sort({ dueDate: 1 });
};

export const Task = mongoose.model<ITask>('Task', taskSchema);
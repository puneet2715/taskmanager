import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  memberCount: number;
  
  // Instance methods
  addMember(userId: mongoose.Types.ObjectId): Promise<IProject>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<IProject>;
  isMember(userId: mongoose.Types.ObjectId): boolean;
  isOwner(userId: mongoose.Types.ObjectId): boolean;
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters long'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: null
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project owner is required']
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ name: 1, owner: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for member count
projectSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Pre-save middleware to ensure owner is in members array
projectSchema.pre('save', function(next) {
  // Add owner to members if not already present
  if (!this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

// Instance method to add a member
projectSchema.methods['addMember'] = async function(userId: mongoose.Types.ObjectId): Promise<IProject> {
  const project = this as any;
  if (!project.members.includes(userId)) {
    project.members.push(userId);
    return await project.save();
  }
  return project;
};

// Instance method to remove a member
projectSchema.methods['removeMember'] = async function(userId: mongoose.Types.ObjectId): Promise<IProject> {
  const project = this as any;
  // Cannot remove the owner
  if (project.owner.equals(userId)) {
    throw new Error('Cannot remove project owner from members');
  }
  
  project.members = project.members.filter((memberId: any) => !memberId.equals(userId));
  return await project.save();
};

// Instance method to check if user is a member
projectSchema.methods['isMember'] = function(userId: mongoose.Types.ObjectId): boolean {
  const project = this as any;
  return project.members.some((memberId: any) => memberId.equals(userId));
};

// Instance method to check if user is the owner
projectSchema.methods['isOwner'] = function(userId: mongoose.Types.ObjectId): boolean {
  const project = this as any;
  return project.owner.equals(userId);
};

// Static method to find projects by user (as owner or member)
projectSchema.statics['findByUser'] = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    $or: [
      { owner: userId },
      { members: userId }
    ]
  }).populate('owner', 'name email avatar')
    .populate('members', 'name email avatar')
    .sort({ updatedAt: -1 });
};

export const Project = mongoose.model<IProject>('Project', projectSchema);
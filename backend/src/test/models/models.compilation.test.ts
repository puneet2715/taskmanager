import { User, IUser } from '../../models/User';
import { Project, IProject } from '../../models/Project';
import { Task, ITask, TaskStatus, TaskPriority } from '../../models/Task';
import { ActivityLog, IActivityLog, ActivityAction, EntityType } from '../../models/ActivityLog';
import mongoose from 'mongoose';

describe('Models Compilation and Basic Functionality', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockProjectId = new mongoose.Types.ObjectId();
  const mockTaskId = new mongoose.Types.ObjectId();

  describe('User Model', () => {
    it('should create a user instance with valid data', () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const user = new User(userData);
      
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(typeof user.comparePassword).toBe('function');
    });

    it('should have required validation', () => {
      const user = new User({});
      const validationError = user.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError?.errors).toBeDefined();
    });
  });

  describe('Project Model', () => {
    it('should create a project instance with valid data', () => {
      const projectData = {
        name: 'Test Project',
        owner: mockUserId,
        members: [mockUserId]
      };

      const project = new Project(projectData);
      
      expect(project.name).toBe('Test Project');
      expect(project.owner).toEqual(mockUserId);
      expect(project.members).toContain(mockUserId);
      expect(typeof project.addMember).toBe('function');
      expect(typeof project.removeMember).toBe('function');
      expect(typeof project.isMember).toBe('function');
      expect(typeof project.isOwner).toBe('function');
    });

    it('should have required validation', () => {
      const project = new Project({});
      const validationError = project.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError?.errors).toBeDefined();
    });
  });

  describe('Task Model', () => {
    it('should create a task instance with valid data', () => {
      const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        position: 0,
        createdBy: mockUserId
      };

      const task = new Task(taskData);
      
      expect(task.title).toBe('Test Task');
      expect(task.project).toEqual(mockProjectId);
      expect(task.position).toBe(0);
      expect(task.createdBy).toEqual(mockUserId);
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(typeof task.isOverdue).toBe('function');
      expect(typeof task.updatePosition).toBe('function');
      expect(typeof task.changeStatus).toBe('function');
    });

    it('should have required validation', () => {
      const task = new Task({});
      const validationError = task.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError?.errors).toBeDefined();
    });

    it('should validate enum values', () => {
      const validStatuses: TaskStatus[] = ['todo', 'inprogress', 'done'];
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high'];
      
      validStatuses.forEach(status => {
        const task = new Task({
          title: 'Test Task',
          status,
          project: mockProjectId,
          position: 0,
          createdBy: mockUserId
        });
        expect(task.status).toBe(status);
      });

      validPriorities.forEach(priority => {
        const task = new Task({
          title: 'Test Task',
          priority,
          project: mockProjectId,
          position: 0,
          createdBy: mockUserId
        });
        expect(task.priority).toBe(priority);
      });
    });
  });

  describe('ActivityLog Model', () => {
    it('should create an activity log instance with valid data', () => {
      const logData = {
        action: 'created' as ActivityAction,
        entityType: 'task' as EntityType,
        entityId: mockTaskId,
        user: mockUserId,
        project: mockProjectId
      };

      const log = new ActivityLog(logData);
      
      expect(log.action).toBe('created');
      expect(log.entityType).toBe('task');
      expect(log.entityId).toEqual(mockTaskId);
      expect(log.user).toEqual(mockUserId);
      expect(log.project).toEqual(mockProjectId);
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(typeof log.getFormattedMessage).toBe('function');
    });

    it('should have required validation', () => {
      const log = new ActivityLog({});
      const validationError = log.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError?.errors).toBeDefined();
    });

    it('should validate enum values', () => {
      const validActions: ActivityAction[] = ['created', 'updated', 'deleted', 'moved'];
      const validEntityTypes: EntityType[] = ['task', 'project'];
      
      validActions.forEach(action => {
        const log = new ActivityLog({
          action,
          entityType: 'task',
          entityId: mockTaskId,
          user: mockUserId,
          project: mockProjectId
        });
        expect(log.action).toBe(action);
      });

      validEntityTypes.forEach(entityType => {
        const log = new ActivityLog({
          action: 'created',
          entityType,
          entityId: mockTaskId,
          user: mockUserId,
          project: mockProjectId
        });
        expect(log.entityType).toBe(entityType);
      });
    });

    it('should format messages correctly', () => {
      const log = new ActivityLog({
        action: 'created',
        entityType: 'task',
        entityId: mockTaskId,
        user: mockUserId,
        project: mockProjectId
      });

      expect(log.getFormattedMessage()).toBe('created a new task');
    });
  });

  describe('Model Exports', () => {
    it('should export all models and types correctly', () => {
      expect(User).toBeDefined();
      expect(Project).toBeDefined();
      expect(Task).toBeDefined();
      expect(ActivityLog).toBeDefined();
      
      // Type exports should be available at compile time
      const user: IUser = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      
      const project: IProject = new Project({
        name: 'Test Project',
        owner: mockUserId
      });
      
      const task: ITask = new Task({
        title: 'Test Task',
        project: mockProjectId,
        position: 0,
        createdBy: mockUserId
      });
      
      const log: IActivityLog = new ActivityLog({
        action: 'created',
        entityType: 'task',
        entityId: mockTaskId,
        user: mockUserId,
        project: mockProjectId
      });

      expect(user).toBeInstanceOf(User);
      expect(project).toBeInstanceOf(Project);
      expect(task).toBeInstanceOf(Task);
      expect(log).toBeInstanceOf(ActivityLog);
    });
  });
});
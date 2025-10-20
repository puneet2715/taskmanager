import { AIService } from '../../services/aiService';
import { GeminiClient } from '../../services/geminiClient';

// Mock GeminiClient for testing
class MockGeminiClient extends GeminiClient {
  constructor() {
    super({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      maxTokens: 1000,
      temperature: 0.7
    });
  }

  override async generateContent(_prompt: string, _context?: any): Promise<string> {
    return 'Mock AI response for testing';
  }

  override async validateConnection(): Promise<boolean> {
    return true;
  }

  override isConfigured(): boolean {
    return true;
  }

  override async getUsageStats() {
    return {
      requestsToday: 5,
      quotaLimit: 1000,
      quotaRemaining: 995
    };
  }
}

describe('AIService', () => {
  let aiService: AIService;
  let mockGeminiClient: MockGeminiClient;

  beforeEach(() => {
    mockGeminiClient = new MockGeminiClient();
    aiService = new AIService(mockGeminiClient);
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const result = await aiService.validateApiKey();
      expect(result).toBe(true);
    });
  });

  describe('checkQuotaStatus', () => {
    it('should return quota status', async () => {
      const quotaStatus = await aiService.checkQuotaStatus();
      
      expect(quotaStatus).toHaveProperty('available');
      expect(quotaStatus).toHaveProperty('requestsRemaining');
      expect(quotaStatus).toHaveProperty('quotaLimit');
      expect(quotaStatus.available).toBe(true);
      expect(quotaStatus.requestsRemaining).toBe(995);
      expect(quotaStatus.quotaLimit).toBe(1000);
    });
  });

  describe('getServiceStatus', () => {
    it('should return complete service status', async () => {
      const status = await aiService.getServiceStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('quota');
      expect(status.configured).toBe(true);
      expect(status.connected).toBe(true);
    });
  });

  describe('Enhanced Project Summary Features', () => {
    it('should detect workload imbalance correctly', () => {
      // Test the workload imbalance detection logic
      const aiServiceInstance = aiService as any;
      
      // Balanced workload
      const balancedWorkload = { 'user1': 3, 'user2': 3, 'user3': 2 };
      expect(aiServiceInstance.detectWorkloadImbalance(balancedWorkload)).toBe(false);
      
      // Imbalanced workload (high difference)
      const imbalancedWorkload = { 'user1': 10, 'user2': 2, 'user3': 1 };
      expect(aiServiceInstance.detectWorkloadImbalance(imbalancedWorkload)).toBe(true);
      
      // Single user (no imbalance possible)
      const singleUserWorkload = { 'user1': 5 };
      expect(aiServiceInstance.detectWorkloadImbalance(singleUserWorkload)).toBe(false);
    });

    it('should create enhanced project summary prompt with proper structure', () => {
      const aiServiceInstance = aiService as any;
      
      const mockProjectContext = {
        project: {
          name: 'Test Project',
          description: 'A test project',
          memberCount: 3,
          createdAt: new Date()
        },
        metrics: {
          totalTasks: 10,
          statusBreakdown: { todo: 4, inprogress: 3, done: 3 },
          priorityBreakdown: { high: 2, medium: 5, low: 3 },
          assignmentBreakdown: { 'John': 4, 'Jane': 3, 'Unassigned': 3 },
          timelineAnalysis: {
            overdueTasks: 1,
            upcomingTasks: 2,
            tasksWithoutDueDate: 5,
            averageTaskAge: 15.5
          },
          activityMetrics: {
            recentlyCreated: 2,
            recentlyUpdated: 3,
            staleTasksCount: 1
          },
          teamMetrics: {
            totalMembers: 3,
            activeMembers: 2,
            workloadDistribution: { 'user1': 4, 'user2': 3 }
          }
        },
        taskSummaries: [
          {
            id: 1,
            title: 'Test Task',
            description: 'A test task',
            status: 'todo',
            priority: 'high',
            assignedTo: 'John',
            dueDate: '2024-01-15',
            isOverdue: false,
            daysSinceCreated: 5,
            daysSinceUpdated: 2
          }
        ],
        insights: {
          hasOverdueTasks: true,
          hasUpcomingDeadlines: true,
          hasUnassignedTasks: true,
          hasHighPriorityTasks: true,
          hasStaleContent: true,
          workloadImbalance: false,
          progressStalled: false
        },
        analysisTimestamp: new Date().toISOString()
      };

      const prompt = aiServiceInstance.createProjectSummaryPrompt(mockProjectContext);
      
      // Verify prompt contains key sections
      expect(prompt).toContain('PROJECT CONTEXT');
      expect(prompt).toContain('CURRENT METRICS');
      expect(prompt).toContain('KEY TASK DETAILS');
      expect(prompt).toContain('PROJECT HEALTH OVERVIEW');
      expect(prompt).toContain('CRITICAL INSIGHTS');
      expect(prompt).toContain('IMMEDIATE ATTENTION NEEDED');
      expect(prompt).toContain('RECOMMENDED NEXT ACTIONS');
      expect(prompt).toContain('SUCCESS METRICS TO TRACK');
      
      // Verify project data is included
      expect(prompt).toContain('Test Project');
      expect(prompt).toContain('**Total Tasks:** 10');
      expect(prompt).toContain('Overdue Tasks: 1');
      expect(prompt).toContain('Test Task');
    });
  });
});
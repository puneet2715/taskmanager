#!/usr/bin/env ts-node

// Simple test to check the new prompt length
const mockProjectContext = {
  project: {
    name: 'Test Project',
    description: 'A test project for validation',
    memberCount: 5
  },
  metrics: {
    totalTasks: 25,
    statusBreakdown: { todo: 10, inprogress: 8, done: 7 },
    priorityBreakdown: { high: 5, medium: 12, low: 8 },
    timelineAnalysis: { overdueTasks: 2, upcomingTasks: 3 }
  },
  taskSummaries: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    title: `Task ${i + 1}`,
    status: 'todo',
    assignedTo: 'John Doe',
    isOverdue: i === 0
  })),
  insights: {
    hasOverdueTasks: true,
    hasUpcomingDeadlines: true,
    hasUnassignedTasks: false,
    hasHighPriorityTasks: true,
    hasStaleContent: false,
    workloadImbalance: false
  }
};

// Simulate the prompt creation
const createProjectSummaryPrompt = (projectContext: any): string => {
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
};

const generatedPrompt = createProjectSummaryPrompt(mockProjectContext);
console.log('Prompt length:', generatedPrompt.length);
console.log('Prompt preview:');
console.log(generatedPrompt.substring(0, 500) + '...');
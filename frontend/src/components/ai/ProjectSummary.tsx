'use client';

import React, { useState } from 'react';
import { ProjectSummary as ProjectSummaryType } from '@/types/api';
import { useLatestProjectSummary, useGenerateProjectSummary, useAIAvailability } from '@/hooks/useAI';

interface ProjectSummaryProps {
  projectId: string;
  onSummaryGenerated?: (summary: ProjectSummaryType) => void;
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({
  projectId,
  onSummaryGenerated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  // Hooks
  const { data: existingSummary, isLoading: isLoadingExisting } = useLatestProjectSummary(projectId);
  const generateSummaryMutation = useGenerateProjectSummary();
  const { isAvailable, hasQuota, quotaRemaining } = useAIAvailability();

  const isGenerating = generateSummaryMutation.isPending;
  const hasSummary = !!existingSummary;

  const handleGenerateSummary = async () => {
    if (!isAvailable || !hasQuota) return;

    try {
      const newSummary = await generateSummaryMutation.mutateAsync(projectId);
      onSummaryGenerated?.(newSummary);
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!existingSummary?.summary) return;

    try {
      await navigator.clipboard.writeText(existingSummary.summary);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Show component even if AI is not available, but with appropriate messaging

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-100 rounded-full">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">AI Project Summary</h3>
          </div>

          {!isAvailable && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
              AI Unavailable
            </span>
          )}
          {isAvailable && !hasQuota && (
            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium">
              Quota exceeded
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Generate Button */}
        <div className="mb-4">
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating || !hasQuota || isLoadingExisting || !isAvailable}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isGenerating || !hasQuota || isLoadingExisting || !isAvailable
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Generating...</span>
              </div>
            ) : isLoadingExisting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-pulse h-3 w-3 bg-gray-400 rounded-full"></div>
                <span>Loading...</span>
              </div>
            ) : hasSummary ? (
              'Generate New Summary'
            ) : (
              'Generate AI Summary'
            )}
          </button>

          {/* Status Messages */}
          {!isAvailable && (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-700 font-medium">
                AI features are currently unavailable. Please check your configuration.
              </p>
            </div>
          )}

          {isAvailable && !hasQuota && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 font-medium">
                Daily AI quota exceeded. Try again tomorrow.
              </p>
            </div>
          )}

          {isAvailable && hasQuota && quotaRemaining <= 5 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">
                {quotaRemaining} AI requests remaining today
              </p>
            </div>
          )}
        </div>

        {/* Summary Display */}
        {hasSummary && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                Generated {formatDate(existingSummary.generatedAt)}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className={`text-xs font-medium transition-colors ${
                    showCopiedMessage 
                      ? 'text-green-600' 
                      : 'text-gray-600 hover:text-gray-700'
                  }`}
                >
                  {showCopiedMessage ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-4 gap-1 mb-3 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-sm font-bold text-gray-900">
                  {existingSummary.taskCount}
                </div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-sm font-bold text-blue-600">
                  {existingSummary.statusBreakdown.todo}
                </div>
                <div className="text-xs text-blue-600">To Do</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <div className="text-sm font-bold text-yellow-600">
                  {existingSummary.statusBreakdown.inprogress}
                </div>
                <div className="text-xs text-yellow-600">Progress</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-sm font-bold text-green-600">
                  {existingSummary.statusBreakdown.done}
                </div>
                <div className="text-xs text-green-600">Done</div>
              </div>
            </div>

            {/* Summary Text */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className={`text-sm text-gray-700 leading-relaxed ${
                isExpanded ? '' : 'overflow-hidden'
              }`}>
                <div className={isExpanded ? '' : 'max-h-16 overflow-hidden'}>
                  {existingSummary.summary}
                </div>
              </div>

              {!isExpanded && existingSummary.summary.length > 200 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                >
                  Read more...
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {generateSummaryMutation.isError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-red-700 font-medium">
                  Failed to generate summary
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {generateSummaryMutation.error?.message || 'Please try again later'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
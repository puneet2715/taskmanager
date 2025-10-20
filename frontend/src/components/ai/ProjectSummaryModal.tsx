'use client';

import React, { useState } from 'react';
import { ProjectSummary as ProjectSummaryType } from '@/types/api';
import { useLatestProjectSummary, useGenerateProjectSummary, useAIAvailability } from '@/hooks/useAI';
import { X, Sparkles, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectSummaryModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSummaryGenerated?: (summary: ProjectSummaryType) => void;
}

export const ProjectSummaryModal: React.FC<ProjectSummaryModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onSummaryGenerated,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
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

  // Format the AI summary text for better readability
  const formatSummaryText = (text: string) => {
    if (!text) return '';
    
    // Split by sentences and clean up
    const formatted = text
      // Add line breaks after periods followed by capital letters (new sentences)
      .replace(/\.\s+([A-Z])/g, '.\n\n$1')
      // Add line breaks before common bullet point indicators
      .replace(/\s+(•|▪|‣|\*|-)\s+/g, '\n• ')
      // Add line breaks before numbered lists
      .replace(/\s+(\d+\.)\s+/g, '\n$1 ')
      // Add line breaks before common section indicators
      .replace(/\s+(Key|Important|Critical|Note|Summary|Overview|Progress|Status|Next|Action|TODO|OVERDUE):/gi, '\n\n**$1:**')
      // Clean up multiple line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();

    return formatted;
  };

  // Render formatted text with proper styling
  const renderFormattedText = (text: string) => {
    const formatted = formatSummaryText(text);
    const lines = formatted.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        return <br key={index} />;
      }
      
      // Handle bold headers (wrapped in **)
      if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={index} className="mb-2">
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <span key={partIndex} className="font-semibold text-gray-900">
                    {part.slice(2, -2)}
                  </span>
                );
              }
              return part;
            })}
          </p>
        );
      }
      
      // Handle bullet points
      if (trimmedLine.startsWith('•')) {
        return (
          <div key={index} className="flex items-start mb-1 ml-2">
            <span className="text-blue-600 mr-2 mt-1 text-xs">•</span>
            <span className="flex-1">{trimmedLine.slice(1).trim()}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(trimmedLine)) {
        return (
          <div key={index} className="flex items-start mb-1 ml-2">
            <span className="text-blue-600 mr-2 font-medium text-sm">
              {trimmedLine.match(/^\d+\./)?.[0]}
            </span>
            <span className="flex-1">{trimmedLine.replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2 leading-relaxed">
          {trimmedLine}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-all"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">AI Project Summary</h2>
                  <p className="text-sm text-gray-600">Get insights about your project progress</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
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
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Generate Button */}
            <div className="mb-6">
              <button
                onClick={handleGenerateSummary}
                disabled={isGenerating || !hasQuota || isLoadingExisting || !isAvailable}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isGenerating || !hasQuota || isLoadingExisting || !isAvailable
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating Summary...</span>
                  </div>
                ) : isLoadingExisting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-pulse h-4 w-4 bg-gray-400 rounded-full"></div>
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
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">
                    AI features are currently unavailable. Please check your configuration.
                  </p>
                </div>
              )}

              {isAvailable && !hasQuota && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    Daily AI quota exceeded. Try again tomorrow.
                  </p>
                </div>
              )}

              {isAvailable && hasQuota && quotaRemaining <= 5 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium">
                    {quotaRemaining} AI requests remaining today
                  </p>
                </div>
              )}
            </div>

            {/* Summary Display */}
            {hasSummary && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">
                    Generated {formatDate(existingSummary.generatedAt)}
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCopyToClipboard}
                      className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                        showCopiedMessage 
                          ? 'text-green-600' 
                          : 'text-gray-600 hover:text-gray-700'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      <span>{showCopiedMessage ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Task Statistics */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {existingSummary.taskCount}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Tasks</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {existingSummary.statusBreakdown.todo}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">To Do</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {existingSummary.statusBreakdown.inprogress}
                    </div>
                    <div className="text-sm text-yellow-600 mt-1">In Progress</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {existingSummary.statusBreakdown.done}
                    </div>
                    <div className="text-sm text-green-600 mt-1">Done</div>
                  </div>
                </div>

                {/* Summary Text */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <div className={`text-sm text-gray-700 ${
                    isExpanded ? '' : 'overflow-hidden'
                  }`}>
                    <div className={isExpanded ? '' : 'max-h-32 overflow-hidden relative'}>
                      {renderFormattedText(existingSummary.summary)}
                      {!isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {!isExpanded && existingSummary.summary.length > 200 && (
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-3 font-medium inline-flex items-center"
                    >
                      <span>Read more</span>
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {generateSummaryMutation.isError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-red-700 font-medium">
                      Failed to generate summary
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {generateSummaryMutation.error?.message || 'Please try again later'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
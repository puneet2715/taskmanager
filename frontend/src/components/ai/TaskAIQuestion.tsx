'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Task, AIResponse as AIResponseType } from '@/types/api';
import { useTaskQuestionHistory, useAskTaskQuestion, useAIAvailability } from '@/hooks/useAI';

interface TaskAIQuestionProps {
  task: Task;
  onQuestionAnswered?: (response: AIResponseType) => void;
}

export const TaskAIQuestion: React.FC<TaskAIQuestionProps> = ({
  task,
  onQuestionAnswered,
}) => {
  const [question, setQuestion] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { data: questionHistory = [], isLoading: isLoadingHistory } = useTaskQuestionHistory(task._id);
  const askQuestionMutation = useAskTaskQuestion();
  const { isAvailable, hasQuota, quotaRemaining } = useAIAvailability();

  const isAsking = askQuestionMutation.isPending;
  const hasHistory = questionHistory.length > 0;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && hasHistory) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [questionHistory.length, hasHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking || !hasQuota) return;

    const trimmedQuestion = question.trim();
    setQuestion(''); // Clear input immediately for better UX

    try {
      const response = await askQuestionMutation.mutateAsync({
        taskId: task._id,
        question: trimmedQuestion,
      });
      onQuestionAnswered?.(response);
    } catch (error) {
      console.error('Failed to ask question:', error);
      // Restore question on error
      setQuestion(trimmedQuestion);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Show component even if AI is not available, but with appropriate messaging

  return (
    <div className="border-t border-gray-200 mt-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 -mx-6 px-6 py-3 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-purple-100 rounded-full">
              <svg
                className="w-3 h-3 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-gray-900">Ask AI about this task</h4>
          </div>

          {hasHistory && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              {isExpanded ? 'Hide' : 'Show'} History ({questionHistory.length})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">

        {/* Question History */}
        {isExpanded && hasHistory && (
          <div className="mb-4 max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-3">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading history...</span>
              </div>
            ) : (
              questionHistory.map((qa) => (
                <div key={qa._id} className="space-y-2">
                  {/* Question */}
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white rounded-lg px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-sm">{qa.question}</p>
                      <p className="text-xs text-purple-100 mt-1">
                        {formatTime(qa.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-sm text-gray-700 leading-relaxed">{qa.answer}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            qa.confidence > 0.8 ? 'bg-green-400' : 
                            qa.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          <p className="text-xs text-gray-500">
                            {Math.round(qa.confidence * 100)}% confidence
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(qa.answer)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Question Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isAvailable
                  ? "AI features are currently unavailable"
                  : hasQuota
                  ? "Ask a question about this task... (Press Enter to send, Shift+Enter for new line)"
                  : "AI quota exceeded. Try again tomorrow."
              }
              disabled={isAsking || !hasQuota || !isAvailable}
              className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white placeholder-gray-500 min-h-[40px] max-h-32 transition-all ${
                !hasQuota || !isAvailable ? 'bg-gray-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400'
              }`}
              rows={1}
            />
            
            {/* Character count */}
            <div className={`absolute bottom-2 right-2 text-xs ${
              question.length > 450 ? 'text-red-500' : 
              question.length > 400 ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {question.length}/500
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs">
              {!isAvailable ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600 font-medium">AI features are currently unavailable</span>
                </div>
              ) : hasQuota ? (
                quotaRemaining <= 5 ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span className="text-amber-600 font-medium">
                      {quotaRemaining} AI requests remaining today
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500">AI-powered responses based on task context</span>
                )
              ) : (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-red-600 font-medium">Daily AI quota exceeded</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!question.trim() || isAsking || !hasQuota || !isAvailable || question.length > 500}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                !question.trim() || isAsking || !hasQuota || !isAvailable || question.length > 500
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5'
              }`}
            >
              {isAsking ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Asking...</span>
                </div>
              ) : (
                'Ask AI'
              )}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {askQuestionMutation.isError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-red-700 font-medium">
                  Failed to get AI response
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {askQuestionMutation.error?.message || 'Please try again later'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';

export interface UsageStats {
  requestsToday: number;
  quotaLimit: number;
  quotaRemaining: number;
}

export interface GeminiClientConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private config: GeminiClientConfig;
  private requestCount: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(config: GeminiClientConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({
      apiKey: config.apiKey
    });
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(prompt: string, context?: any): Promise<string> {
    return this.generateContentWithRetry(prompt, context, 3);
  }

  /**
   * Generate content with retry logic
   */
  private async generateContentWithRetry(prompt: string, context?: any, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
      logger.info('[Gemini Client] Starting content generation', {
        promptLength: prompt.length,
        hasContext: !!context,
        model: this.config.model
      });

      this.incrementRequestCount();

      // Prepare the full prompt with context if provided
      const fullPrompt = context
        ? `Context: ${JSON.stringify(context, null, 2)}\n\nPrompt: ${prompt}`
        : prompt;

      logger.info('[Gemini Client] Prepared full prompt', {
        fullPromptLength: fullPrompt.length,
        hasContext: !!context
      });

      logger.info('[Gemini Client] Making API call to Gemini');
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API request timeout')), 30000); // 30 second timeout
      });
      
      const apiPromise = this.ai.models.generateContent({
        model: this.config.model,
        contents: fullPrompt
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);

      logger.info('[Gemini Client] Received response from Gemini API', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        hasCandidates: response && typeof response === 'object' && 'candidates' in response,
        candidatesLength: response && typeof response === 'object' && 'candidates' in response ? (response as any).candidates?.length : 0
      });

      if (!response) {
        logger.error('[Gemini Client] No response from Gemini API');
        throw new Error('No response from Gemini API');
      }

      // Handle different possible response structures
      let text: string | undefined;
      
      if (typeof response === 'string') {
        text = response;
      } else if (response && typeof response === 'object') {
        const responseObj = response as any;
        
        if (responseObj.text && typeof responseObj.text === 'string') {
          text = responseObj.text;
        } else if (responseObj.candidates && Array.isArray(responseObj.candidates) && responseObj.candidates.length > 0) {
          const candidate = responseObj.candidates[0];
          if (candidate && candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
            const part = candidate.content.parts[0];
            if (part && typeof part.text === 'string') {
              text = part.text;
            }
          }
        }
      }
      
      if (!text || typeof text !== 'string') {
        logger.error('[Gemini Client] Could not extract valid text from Gemini API response', { 
          response: JSON.stringify(response, null, 2),
          textType: typeof text,
          textValue: text
        });
        throw new Error('Could not extract valid text from Gemini API response');
      }

      logger.info('[Gemini Client] Successfully generated content', {
        responseLength: text.length,
        responsePreview: text.substring(0, 100)
      });

      return text;
    } catch (error) {
      logger.error('Error generating content with Gemini API', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promptLength: prompt.length
      });

      if (error instanceof Error) {
        // Handle specific Gemini API errors
        if (error.message.includes('API_KEY') || error.message.includes('401')) {
          throw new Error('Invalid Gemini API key');
        }
        if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
          throw new Error('Gemini API quota exceeded');
        }
        if (error.message.includes('RATE_LIMIT') || error.message.includes('rate limit')) {
          throw new Error('Gemini API rate limit exceeded');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Gemini API request timeout - please try again');
        }
        if (error.message.includes('network') || error.message.includes('ECONNRESET')) {
          throw new Error('Network error connecting to Gemini API');
        }
        
        // Log the original error for debugging
        logger.error('[Gemini Client] Unhandled API error:', {
          message: error.message,
          stack: error.stack
        });
      }

      lastError = new Error('Failed to generate content with Gemini API');
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('API_KEY') || 
            error.message.includes('401') ||
            error.message.includes('QUOTA_EXCEEDED') ||
            error.message.includes('429')) {
          throw error; // Don't retry auth or quota errors
        }
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`[Gemini Client] Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }
    }
    
    throw lastError || new Error('Failed to generate content with Gemini API after retries');
  }

  /**
   * Validate connection to Gemini API
   */
  async validateConnection(): Promise<boolean> {
    try {
      logger.info('[Gemini Client] Validating Gemini API connection');
      
      if (!this.isConfigured()) {
        logger.warn('[Gemini Client] Cannot validate connection - client not configured');
        return false;
      }

      const testPrompt = 'Hello, this is a connection test. Please respond with "Connection successful".';
      logger.info('[Gemini Client] Sending test prompt to Gemini API');
      
      const response = await this.generateContent(testPrompt);

      const isValid = response.toLowerCase().includes('connection successful') ||
        response.toLowerCase().includes('hello') ||
        response.trim().length > 0;

      logger.info('[Gemini Client] Gemini API connection validation result', { 
        isValid,
        responseLength: response.length,
        responsePreview: response.substring(0, 100)
      });
      return isValid;
    } catch (error) {
      logger.error('[Gemini Client] Gemini API connection validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    // Reset daily counter if needed
    const currentDate = new Date().toDateString();
    if (this.lastResetDate !== currentDate) {
      this.requestCount = 0;
      this.lastResetDate = currentDate;
    }

    // Note: Actual quota limits would need to be retrieved from Google Cloud Console
    // For now, we'll use reasonable defaults
    const quotaLimit = 1000; // Daily limit
    const quotaRemaining = Math.max(0, quotaLimit - this.requestCount);

    return {
      requestsToday: this.requestCount,
      quotaLimit,
      quotaRemaining
    };
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    const hasApiKey = !!this.config.apiKey;
    const isNotPlaceholder = this.config.apiKey !== 'your_gemini_api_key_here';
    const configured = hasApiKey && isNotPlaceholder;
    
    logger.info('[Gemini Client] Configuration check:', {
      hasApiKey,
      isNotPlaceholder,
      configured,
      apiKeyLength: this.config.apiKey ? this.config.apiKey.length : 0,
      model: this.config.model
    });
    
    return configured;
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<GeminiClientConfig, 'apiKey'> {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };
  }

  private incrementRequestCount(): void {
    const currentDate = new Date().toDateString();
    if (this.lastResetDate !== currentDate) {
      this.requestCount = 0;
      this.lastResetDate = currentDate;
    }
    this.requestCount++;
  }
}

// Factory function to create Gemini client with environment configuration
export function createGeminiClient(): GeminiClient {
  const config: GeminiClientConfig = {
    apiKey: process.env['GEMINI_API_KEY'] || '',
    model: process.env['GEMINI_MODEL'] || 'gemini-2.5-flash',
    maxTokens: parseInt(process.env['GEMINI_MAX_TOKENS'] || '1000'),
    temperature: parseFloat(process.env['GEMINI_TEMPERATURE'] || '0.7')
  };

  return new GeminiClient(config);
}
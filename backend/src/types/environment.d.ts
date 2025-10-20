declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      FRONTEND_URL?: string;
      MONGODB_URI?: string;
      JWT_SECRET?: string;
      REDIS_URL?: string;
      
      // Gemini AI Configuration
      GEMINI_API_KEY?: string;
      GEMINI_MODEL?: string;
      GEMINI_MAX_TOKENS?: string;
      GEMINI_TEMPERATURE?: string;
      
      // AI Service Configuration
      AI_CACHE_TTL?: string;
      AI_RATE_LIMIT_PER_USER?: string;
      AI_RATE_LIMIT_WINDOW?: string;
      AI_MAX_CONTEXT_LENGTH?: string;
      
      // Feature Flags
      AI_FEATURES_ENABLED?: string;
      AI_SUMMARY_ENABLED?: string;
      AI_QUESTIONS_ENABLED?: string;
    }
  }
}

export {};

import { GeminiClient, createGeminiClient } from '../../services/geminiClient';

describe('GeminiClient', () => {
  let geminiClient: GeminiClient;

  beforeEach(() => {
    const config = {
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
      maxTokens: 1000,
      temperature: 0.7
    };
    geminiClient = new GeminiClient(config);
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      expect(geminiClient.isConfigured()).toBe(true);
    });

    it('should return false when API key is placeholder', () => {
      const configWithPlaceholder = {
        apiKey: 'your_gemini_api_key_here',
        model: 'gemini-1.5-flash',
        maxTokens: 1000,
        temperature: 0.7
      };
      const clientWithPlaceholder = new GeminiClient(configWithPlaceholder);
      expect(clientWithPlaceholder.isConfigured()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return configuration without API key', () => {
      const config = geminiClient.getConfig();
      
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('temperature');
      expect(config).not.toHaveProperty('apiKey');
      expect(config.model).toBe('gemini-1.5-flash');
      expect(config.maxTokens).toBe(1000);
      expect(config.temperature).toBe(0.7);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const stats = await geminiClient.getUsageStats();
      
      expect(stats).toHaveProperty('requestsToday');
      expect(stats).toHaveProperty('quotaLimit');
      expect(stats).toHaveProperty('quotaRemaining');
      expect(typeof stats.requestsToday).toBe('number');
      expect(typeof stats.quotaLimit).toBe('number');
      expect(typeof stats.quotaRemaining).toBe('number');
    });
  });

  describe('createGeminiClient', () => {
    it('should create client with environment variables', () => {
      // Set test environment variables
      process.env.GEMINI_API_KEY = 'test-env-key';
      process.env.GEMINI_MODEL = 'test-model';
      process.env.GEMINI_MAX_TOKENS = '500';
      process.env.GEMINI_TEMPERATURE = '0.5';

      const client = createGeminiClient();
      const config = client.getConfig();

      expect(config.model).toBe('test-model');
      expect(config.maxTokens).toBe(500);
      expect(config.temperature).toBe(0.5);

      // Clean up
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODEL;
      delete process.env.GEMINI_MAX_TOKENS;
      delete process.env.GEMINI_TEMPERATURE;
    });
  });
});
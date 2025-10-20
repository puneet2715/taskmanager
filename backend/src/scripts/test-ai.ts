#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { createGeminiClient } from '../services/geminiClient';
import { aiService } from '../services/aiService';

// Load environment variables
dotenv.config();

async function testAIServices() {
  console.log('=== AI Services Test ===');
  console.log('Environment variables:');
  console.log('- GEMINI_API_KEY:', process.env['GEMINI_API_KEY'] ? `${process.env['GEMINI_API_KEY'].substring(0, 10)}...` : 'NOT SET');
  console.log('- GEMINI_MODEL:', process.env['GEMINI_MODEL'] || 'NOT SET');
  console.log('- AI_FEATURES_ENABLED:', process.env['AI_FEATURES_ENABLED'] || 'NOT SET');
  console.log();

  try {
    // Test Gemini Client
    console.log('1. Testing Gemini Client...');
    const geminiClient = createGeminiClient();
    
    console.log('   - Configuration check:', geminiClient.isConfigured());
    console.log('   - Config details:', geminiClient.getConfig());
    
    if (geminiClient.isConfigured()) {
      console.log('   - Testing connection...');
      const connected = await geminiClient.validateConnection();
      console.log('   - Connection result:', connected);
    }
    
    console.log();

    // Test AI Service
    console.log('2. Testing AI Service...');
    console.log('   - AI Service gemini client config:', (aiService as any).geminiClient.getConfig());
    console.log('   - AI Service gemini client configured:', (aiService as any).geminiClient.isConfigured());
    
    const status = await aiService.getServiceStatus();
    console.log('   - Service status:', status);
    
    console.log();
    console.log('=== Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAIServices().catch(console.error);
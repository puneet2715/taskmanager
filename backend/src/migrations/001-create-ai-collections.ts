import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Migration: Create AI Collections
 * Creates the AISummary and AIQuestion collections with proper indexes
 */

export async function up(): Promise<void> {
  try {
    logger.info('Starting migration: Create AI Collections');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Check if this migration has already been applied by checking for both collections
    const summaryCollectionExists = await db.listCollections({ name: 'aisummaries' }).hasNext();
    const questionCollectionExists = await db.listCollections({ name: 'aiquestions' }).hasNext();
    
    if (summaryCollectionExists && questionCollectionExists) {
      logger.info('AI collections already exist, migration may have been partially applied. Continuing with index creation...');
    }

    // Create AISummary collection with indexes
    logger.info('Creating AISummary collection...');
    
    // Check if collection already exists
    const aiSummaryExists = await db.listCollections({ name: 'aisummaries' }).hasNext();
    if (!aiSummaryExists) {
      try {
        await db.createCollection('aisummaries');
        logger.info('AISummary collection created');
      } catch (error: any) {
        if (error.code === 48) { // NamespaceExists error
          logger.info('AISummary collection already exists (race condition)');
        } else {
          throw error;
        }
      }
    } else {
      logger.info('AISummary collection already exists');
    }

    // Create indexes for AISummary
    const aiSummaryCollection = db.collection('aisummaries');
    
    try {
      await aiSummaryCollection.createIndex(
        { projectId: 1, generatedAt: -1 },
        { name: 'projectId_generatedAt_idx' }
      );
      
      await aiSummaryCollection.createIndex(
        { userId: 1, generatedAt: -1 },
        { name: 'userId_generatedAt_idx' }
      );
      
      await aiSummaryCollection.createIndex(
        { projectId: 1, userId: 1, generatedAt: -1 },
        { name: 'projectId_userId_generatedAt_idx' }
      );
      
      await aiSummaryCollection.createIndex(
        { expiresAt: 1 },
        { 
          name: 'expiresAt_ttl_idx',
          expireAfterSeconds: 0 // TTL index for automatic cleanup
        }
      );
      
      logger.info('AISummary indexes created');
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict or similar
        logger.info('AISummary indexes already exist or have conflicts, skipping');
      } else {
        logger.warn('Some AISummary indexes may have failed to create:', error.message);
      }
    }

    // Create AIQuestion collection with indexes
    logger.info('Creating AIQuestion collection...');
    
    const aiQuestionExists = await db.listCollections({ name: 'aiquestions' }).hasNext();
    if (!aiQuestionExists) {
      try {
        await db.createCollection('aiquestions');
        logger.info('AIQuestion collection created');
      } catch (error: any) {
        if (error.code === 48) { // NamespaceExists error
          logger.info('AIQuestion collection already exists (race condition)');
        } else {
          throw error;
        }
      }
    } else {
      logger.info('AIQuestion collection already exists');
    }

    // Create indexes for AIQuestion
    const aiQuestionCollection = db.collection('aiquestions');
    
    try {
      await aiQuestionCollection.createIndex(
        { taskId: 1, createdAt: -1 },
        { name: 'taskId_createdAt_idx' }
      );
      
      await aiQuestionCollection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'userId_createdAt_idx' }
      );
      
      await aiQuestionCollection.createIndex(
        { 'context.projectId': 1, createdAt: -1 },
        { name: 'context_projectId_createdAt_idx' }
      );
      
      await aiQuestionCollection.createIndex(
        { conversationId: 1, createdAt: 1 },
        { name: 'conversationId_createdAt_idx' }
      );
      
      await aiQuestionCollection.createIndex(
        { taskId: 1, userId: 1, createdAt: -1 },
        { name: 'taskId_userId_createdAt_idx' }
      );
      
      // Text index for searching
      await aiQuestionCollection.createIndex(
        { 
          question: 'text', 
          answer: 'text',
          'context.taskTitle': 'text'
        },
        {
          name: 'ai_question_text_idx',
          weights: {
            question: 10,
            'context.taskTitle': 5,
            answer: 1
          }
        }
      );
      
      logger.info('AIQuestion indexes created');
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict or similar
        logger.info('AIQuestion indexes already exist or have conflicts, skipping');
      } else {
        logger.warn('Some AIQuestion indexes may have failed to create:', error.message);
      }
    }
    logger.info('Migration completed successfully: Create AI Collections');
    
  } catch (error) {
    logger.error('Migration failed: Create AI Collections', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  try {
    logger.info('Starting rollback: Create AI Collections');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Drop AIQuestion collection
    const aiQuestionExists = await db.listCollections({ name: 'aiquestions' }).hasNext();
    if (aiQuestionExists) {
      await db.dropCollection('aiquestions');
      logger.info('AIQuestion collection dropped');
    }

    // Drop AISummary collection
    const aiSummaryExists = await db.listCollections({ name: 'aisummaries' }).hasNext();
    if (aiSummaryExists) {
      await db.dropCollection('aisummaries');
      logger.info('AISummary collection dropped');
    }
    
    logger.info('Rollback completed successfully: Create AI Collections');
    
  } catch (error) {
    logger.error('Rollback failed: Create AI Collections', error);
    throw error;
  }
}

// Migration metadata
export const migration = {
  version: '001',
  name: 'create-ai-collections',
  description: 'Creates AISummary and AIQuestion collections with proper indexes',
  up,
  down
};
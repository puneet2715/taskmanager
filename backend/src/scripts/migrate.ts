#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { runMigrations, rollbackLastMigration, getMigrationStatus } from '../migrations';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2];
  
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database');
    
    switch (command) {
      case 'up':
        await runMigrations();
        logger.info('Migrations completed');
        break;
        
      case 'down':
        await rollbackLastMigration();
        logger.info('Rollback completed');
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        console.log('\n=== Migration Status ===');
        console.log(`Total migrations: ${status.total}`);
        console.log(`Applied: ${status.applied.length}`);
        console.log(`Pending: ${status.pending.length}`);
        
        if (status.applied.length > 0) {
          console.log('\nApplied migrations:');
          status.applied.forEach(m => {
            console.log(`  ✓ ${m.version} - ${m.name} (${m.appliedAt.toISOString()})`);
          });
        }
        
        if (status.pending.length > 0) {
          console.log('\nPending migrations:');
          status.pending.forEach(m => {
            console.log(`  ○ ${m.version} - ${m.name}`);
          });
        }
        break;
        
      default:
        console.log('Usage: npm run migrate [up|down|status]');
        console.log('  up     - Run all pending migrations');
        console.log('  down   - Rollback the last migration');
        console.log('  status - Show migration status');
        process.exit(1);
    }
    
  } catch (error) {
    logger.error('Migration script failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run the script
main();
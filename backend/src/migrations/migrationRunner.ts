import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { migration as createAICollections } from './001-create-ai-collections';

interface Migration {
  version: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

interface MigrationRecord {
  _id?: mongoose.Types.ObjectId;
  version: string;
  name: string;
  appliedAt: Date;
}

// Registry of all available migrations
const migrations: Migration[] = [
  createAICollections
];

class MigrationRunner {
  private static instance: MigrationRunner;
  private migrationsCollection: mongoose.Collection;

  private constructor() {
    this.migrationsCollection = mongoose.connection.collection('migrations');
  }

  public static getInstance(): MigrationRunner {
    if (!MigrationRunner.instance) {
      MigrationRunner.instance = new MigrationRunner();
    }
    return MigrationRunner.instance;
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');
      
      // Ensure migrations collection exists
      await this.ensureMigrationsCollection();
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));
      
      // Find pending migrations
      const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.version));
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }
      
      logger.info(`Found ${pendingMigrations.length} pending migrations`);
      
      // Run pending migrations in order
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      logger.info('All migrations completed successfully');
      
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Run a specific migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Running migration: ${migration.version} - ${migration.name}`);
      
      // Run the migration
      await migration.up();
      
      // Record the migration as applied
      await this.recordMigration(migration);
      
      logger.info(`Migration completed: ${migration.version} - ${migration.name}`);
      
    } catch (error) {
      logger.error(`Migration failed: ${migration.version} - ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  public async rollbackLastMigration(): Promise<void> {
    try {
      logger.info('Starting migration rollback...');
      
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }
      
      // Get the last applied migration
      const lastMigration = appliedMigrations[appliedMigrations.length - 1];
      if (!lastMigration) {
        throw new Error('No migration record found to rollback');
      }
      
      const migration = migrations.find(m => m.version === lastMigration.version);
      
      if (!migration) {
        throw new Error(`Migration not found: ${lastMigration.version}`);
      }
      
      logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);
      
      // Run the rollback
      await migration.down();
      
      // Remove the migration record
      await this.removeMigrationRecord(migration.version);
      
      logger.info(`Rollback completed: ${migration.version} - ${migration.name}`);
      
    } catch (error) {
      logger.error('Migration rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<{
    applied: MigrationRecord[];
    pending: Migration[];
    total: number;
  }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.version));
    
    return {
      applied: appliedMigrations,
      pending: pendingMigrations,
      total: migrations.length
    };
  }

  /**
   * Ensure migrations collection exists
   */
  private async ensureMigrationsCollection(): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collections = await db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('migrations');
      await this.migrationsCollection.createIndex({ version: 1 }, { unique: true });
      logger.info('Migrations collection created');
    }
  }

  /**
   * Get all applied migrations
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    return await this.migrationsCollection
      .find({})
      .sort({ appliedAt: 1 })
      .toArray() as MigrationRecord[];
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(migration: Migration): Promise<void> {
    await this.migrationsCollection.insertOne({
      version: migration.version,
      name: migration.name,
      appliedAt: new Date()
    });
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(version: string): Promise<void> {
    await this.migrationsCollection.deleteOne({ version });
  }
}

// Export singleton instance and convenience functions
export const migrationRunner = MigrationRunner.getInstance();
export const runMigrations = () => migrationRunner.runMigrations();
export const rollbackLastMigration = () => migrationRunner.rollbackLastMigration();
export const getMigrationStatus = () => migrationRunner.getMigrationStatus();
/**
 * Migration runner module
 *
 * Provides functionality to execute database migrations in a controlled,
 * transactional manner with proper logging and error handling.
 */

import fs from 'fs';
import path from 'path';
import { getDb } from '../index';
import {
  getMigrationFiles,
  extractVersion,
  hasMigrationBeenApplied,
  recordMigration,
} from './tracking';
import { logInfo, logError, getRequestId } from '@/lib/logger';

export interface MigrationResult {
  version: string;
  success: boolean;
  error?: string;
  appliedAt?: string;
}

export interface RunMigrationsResult {
  success: boolean;
  executed: MigrationResult[];
  failed: MigrationResult[];
  skipped: number;
}

/**
 * Execute a single migration file within a transaction
 *
 * This function:
 * 1. Reads the migration SQL file
 * 2. Executes it within a transaction
 * 3. Records the migration in _migrations table on success
 * 4. Returns the result
 *
 * @param version - Migration version to execute
 * @param migrationsDir - Directory containing migration files
 * @returns Migration result with success status and error details if applicable
 */
function executeMigration(
  version: string,
  migrationsDir: string
): MigrationResult {
  const filename = `${version}.sql`;
  const filePath = path.join(migrationsDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      version,
      success: false,
      error: `Migration file not found: ${filename}`,
    };
  }

  // Read migration SQL
  const sql = fs.readFileSync(filePath, 'utf-8');

  // Check if migration has already been applied
  if (hasMigrationBeenApplied(version)) {
    return {
      version,
      success: true,
      appliedAt: new Date().toISOString(), // Already applied, skip
    };
  }

  const db = getDb();
  const requestId = getRequestId();

  try {
    // Execute migration within a transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // Execute migration SQL
      db.exec(sql);

      // Record migration as applied
      const recorded = recordMigration(version);

      if (!recorded) {
        throw new Error('Failed to record migration in _migrations table');
      }

      // Commit transaction
      db.exec('COMMIT');

      // Log success
      logInfo('Migration executed successfully', {
        version,
        requestId,
      });

      return {
        version,
        success: true,
        appliedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Rollback on any error
      db.exec('ROLLBACK');

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failure with context
      logError('Migration execution failed', {
        version,
        error: errorMessage,
        requestId,
      });

      return {
        version,
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    // Transaction management error
    const errorMessage =
      error instanceof Error ? error.message : 'Transaction error';

    logError('Migration transaction failed', {
      version,
      error: errorMessage,
      requestId,
    });

    return {
      version,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Run all pending migrations
 *
 * This function:
 * 1. Gets all migration files from the filesystem
 * 2. Filters out already applied migrations
 * 3. Executes pending migrations in version order
 * 4. Returns detailed results
 *
 * @returns Result object with success status, executed migrations, and failed migrations
 */
export function runMigrations(): RunMigrationsResult {
  const requestId = getRequestId();

  logInfo('Starting migration run', {
    requestId,
  });

  try {
    // Get all migration files
    const migrationFiles = getMigrationFiles();
    const versions = migrationFiles.map(extractVersion);

    if (versions.length === 0) {
      logInfo('No migration files found', {
        requestId,
      });

      return {
        success: true,
        executed: [],
        failed: [],
        skipped: 0,
      };
    }

    // Get migrations directory
    const currentDir = __dirname;
    const migrationsDir =
      path.basename(currentDir) === 'migrations'
        ? currentDir
        : path.join(path.dirname(currentDir), 'migrations');

    // Execute migrations
    const executed: MigrationResult[] = [];
    const failed: MigrationResult[] = [];
    let skipped = 0;

    for (const version of versions) {
      const result = executeMigration(version, migrationsDir);

      if (result.success) {
        if (result.error) {
          // Already applied
          skipped++;
        } else {
          executed.push(result);
        }
      } else {
        failed.push(result);
      }
    }

    // Determine overall success
    const success = failed.length === 0;

    if (success) {
      logInfo('Migration run completed successfully', {
        executed: executed.length,
        skipped,
        requestId,
      });
    } else {
      logError('Migration run completed with failures', {
        executed: executed.length,
        failed: failed.length,
        skipped,
        requestId,
      });
    }

    return {
      success,
      executed,
      failed,
      skipped,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logError('Migration run failed with unexpected error', {
      error: errorMessage,
      requestId,
    });

    return {
      success: false,
      executed: [],
      failed: [
        {
          version: 'system',
          success: false,
          error: errorMessage,
        },
      ],
      skipped: 0,
    };
  }
}

/**
 * Health check service
 *
 * Provides system health status information for deployment and monitoring
 */

import {
  verifyDatabaseConnection,
  checkMigrationStatus,
  type MigrationStatus,
} from '@/lib/db';
import { logError, logInfo } from '@/lib/logger';

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  checks: {
    app: {
      status: 'ok' | 'error';
    };
    database: {
      status: 'ok' | 'error';
    };
    migrations: {
      status: 'ok' | 'error';
      currentVersion?: string;
    };
  };
  checkedAt: string;
}

/**
 * Check application health status
 *
 * This function performs three main checks:
 * 1. App: Verifies the API process is responsive (always returns ok if function runs)
 * 2. Database: Verifies SQLite connection with SELECT 1 query
 * 3. Migrations: Verifies database schema is at expected version
 *
 * Returns 'ok' if all checks pass
 * Returns 'degraded' if non-critical checks fail (currently not used)
 * Returns 'error' if critical checks fail (database or migrations)
 *
 * Security considerations:
 * - Does not expose sensitive information (database path, SQL, user data)
 * - Does not modify business data
 * - Safe to call without authentication
 */
export async function checkHealth(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {
    app: { status: 'ok' },
    database: { status: 'ok' },
    migrations: { status: 'ok' },
  };

  let overallStatus: HealthStatus = 'ok';

  // 1. Check application status
  // If this function is running, the app is responsive
  checks.app.status = 'ok';

  // 2. Check database connection
  try {
    const dbConnected = verifyDatabaseConnection();

    if (!dbConnected) {
      checks.database.status = 'error';
      overallStatus = 'error';
      logError('Health check failed: Database connection failed', {
        check: 'database',
      });
    } else {
      logInfo('Health check: Database connection OK', {
        check: 'database',
      });
    }
  } catch (error) {
    checks.database.status = 'error';
    overallStatus = 'error';
    logError('Health check failed: Database connection error', {
      check: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // 3. Check migration status
  try {
    const migrationStatus: MigrationStatus = checkMigrationStatus();

    if (!migrationStatus.isConsistent) {
      checks.migrations.status = 'error';
      overallStatus = 'error';

      logError('Health check failed: Migration status inconsistent', {
        check: 'migrations',
        currentVersion: migrationStatus.currentVersion,
        pendingCount: migrationStatus.pendingMigrations.length,
      });
    } else {
      checks.migrations.currentVersion = migrationStatus.currentVersion || undefined;

      logInfo('Health check: Migrations OK', {
        check: 'migrations',
        currentVersion: migrationStatus.currentVersion,
      });
    }
  } catch (error) {
    checks.migrations.status = 'error';
    overallStatus = 'error';
    logError('Health check failed: Migration check error', {
      check: 'migrations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    checks,
    checkedAt: new Date().toISOString(),
  };

  return result;
}

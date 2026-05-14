/**
 * Health check API endpoint
 *
 * GET /api/health
 *
 * Returns system health status for deployment and monitoring purposes.
 * This endpoint does not require authentication.
 *
 * Security:
 * - No authentication required (health check is public)
 * - Does not expose sensitive information
 * - Does not modify any data
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkHealth } from '@/lib/services/health';
import { getRequestId } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    // Perform health checks
    const healthResult = await checkHealth();

    // Get requestId for tracing
    const requestId = getRequestId();

    // Return health status with requestId
    return NextResponse.json({
      ...healthResult,
      requestId,
    });
  } catch {
    // Health check itself should never fail
    // If it does, return error status
    const requestId = getRequestId();

    return NextResponse.json(
      {
        status: 'error' as const,
        checks: {
          app: { status: 'error' as const },
          database: { status: 'error' as const },
          migrations: { status: 'error' as const },
        },
        requestId,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

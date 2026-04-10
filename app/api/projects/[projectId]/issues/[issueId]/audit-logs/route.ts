import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogsForIssue } from '@/lib/services/issue-audit-logs';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

/**
 * GET /api/projects/[projectId]/issues/[issueId]/audit-logs
 *
 * Retrieve all audit logs for a specific issue.
 * Only authenticated users who own the project can access audit logs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  try {
    const { projectId, issueId } = await params;

    // Validate path parameters
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
    };

    // Get audit logs for the issue
    const auditLogs = await getAuditLogsForIssue(
      validatedParams.projectId,
      validatedParams.issueId
    );

    return NextResponse.json(auditLogs);
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Handle application errors
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'NOT_FOUND'
            ? 404
            : 500,
      });
    }

    // Handle unexpected errors
    console.error('Unexpected error in get audit logs:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogsForIssue } from '@/lib/services/issue-audit-logs';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';
import { z } from 'zod';

// Query parameters schema for pagination
const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

/**
 * GET /api/projects/[projectId]/issues/[issueId]/audit-logs
 *
 * Retrieve audit logs for a specific issue with pagination.
 * Only authenticated project members (owners and members) can access audit logs.
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

    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = auditLogsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { limit = 20, offset = 0 } = queryValidation.data;

    // Get audit logs for the issue
    const result = await getAuditLogsForIssue(
      validatedParams.projectId,
      validatedParams.issueId,
      limit,
      offset
    );

    return NextResponse.json(result);
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
            : error.code === 'FORBIDDEN'
            ? 403
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

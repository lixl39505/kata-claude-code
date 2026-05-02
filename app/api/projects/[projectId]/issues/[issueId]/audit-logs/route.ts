import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogsForIssue } from '@/lib/services/issue-audit-logs';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';
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
    const validatedQuery = auditLogsQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const { limit = 20, offset = 0 } = validatedQuery;

    // Get audit logs for the issue
    const result = await getAuditLogsForIssue(
      validatedParams.projectId,
      validatedParams.issueId,
      limit,
      offset
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'getIssueAuditLogs');
  }
}

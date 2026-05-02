import { NextRequest, NextResponse } from 'next/server';
import {
  createCommentInIssue,
  listCommentsForIssue,
} from '@/lib/services/issue-comment';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { createCommentSchema } from '@/lib/validators/issue-comment';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/projects/[projectId]/issues/[issueId]/comments
 *
 * Create a new comment on an issue.
 */
export async function POST(
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

    // Validate request body
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Create comment
    const comment = await createCommentInIssue(
      validatedParams.projectId,
      validatedParams.issueId,
      validatedData
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'createComment');
  }
}

/**
 * GET /api/projects/[projectId]/issues/[issueId]/comments
 *
 * List all comments for an issue.
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

    // Get comments
    const comments = await listCommentsForIssue(
      validatedParams.projectId,
      validatedParams.issueId
    );

    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error, 'listComments');
  }
}
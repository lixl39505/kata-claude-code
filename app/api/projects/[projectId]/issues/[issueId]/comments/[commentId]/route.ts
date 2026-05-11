import { NextRequest, NextResponse } from 'next/server';
import { deleteCommentFromIssue } from '@/lib/services/issue-comment';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { commentIdSchema } from '@/lib/validators/issue-comment';
import { handleApiError } from '@/lib/errors';

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/comments/[commentId]
 *
 * Delete a comment from an issue.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string; commentId: string }> }
) {
  try {
    const { projectId, issueId, commentId } = await params;

    // Validate path parameters
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
      ...commentIdSchema.parse({ commentId }),
    };

    // Delete comment
    await deleteCommentFromIssue(
      validatedParams.projectId,
      validatedParams.issueId,
      validatedParams.commentId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'deleteComment');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { removeProjectMember } from '@/lib/services/project-members';
import { AppError } from '@/lib/errors/helpers';

/**
 * DELETE /api/projects/:projectId/members/:userId
 * Remove a member from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; userId: string } }
): Promise<NextResponse> {
  try {
    const { projectId, userId } = params;

    // Remove member
    await removeProjectMember(projectId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in remove project member:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

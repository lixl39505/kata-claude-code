import { NextRequest, NextResponse } from 'next/server';
import { removeProjectMember } from '@/lib/services/project-members';
import { handleApiError } from '@/lib/errors';

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
    return handleApiError(error, 'removeProjectMember');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addProjectMember, listProjectMembers } from '@/lib/services/project-members';
import { addProjectMemberSchema } from '@/lib/validators/project-members';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/projects/:projectId/members
 * List all members of a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  try {
    const { projectId } = params;

    // List members
    const result = await listProjectMembers(projectId);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'listProjectMembers');
  }
}

/**
 * POST /api/projects/:projectId/members
 * Add a member to a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  try {
    const { projectId } = params;

    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = addProjectMemberSchema.parse(body);

    // Add member
    const member = await addProjectMember(projectId, validatedData);

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'addProjectMember');
  }
}

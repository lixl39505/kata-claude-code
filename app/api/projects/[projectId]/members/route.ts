import { NextRequest, NextResponse } from 'next/server';
import { addProjectMember, listProjectMembers } from '@/lib/services/project-members';
import { addProjectMemberSchema } from '@/lib/validators/project-members';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

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
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status: error.code === 'UNAUTHENTICATED' ? 401 : error.code === 'FORBIDDEN' ? 403 : 500,
      });
    }

    console.error('Unexpected error in list project members:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
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
    if (error instanceof ZodError) {
      const zodError = error as { issues?: unknown };
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: zodError.issues || error.toString(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'CONFLICT'
            ? 409
            : 500,
      });
    }

    console.error('Unexpected error in add project member:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

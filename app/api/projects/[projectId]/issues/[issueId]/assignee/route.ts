import { NextRequest, NextResponse } from 'next/server';
import { updateIssueAssignee } from '@/lib/services/issue';
import { updateIssueAssigneeSchema, projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  try {
    const { projectId, issueId } = await params;
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
    };

    const body = await request.json();
    const validatedData = updateIssueAssigneeSchema.parse(body);

    const issue = await updateIssueAssignee(
      validatedParams.projectId,
      validatedParams.issueId,
      validatedData
    );

    return NextResponse.json(issue);
  } catch (error) {
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

    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in update issue assignee:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getIssueByIdForProject } from '@/lib/services/issue';
import { issueIdSchema, projectIdSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  try {
    // Validate params
    const { projectId, issueId } = await params;
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
    };

    // Get issue
    const issue = await getIssueByIdForProject(
      validatedParams.projectId,
      validatedParams.issueId
    );

    return NextResponse.json(issue);
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
            : error.code === 'NOT_FOUND'
            ? 404
            : 500,
      });
    }

    console.error('Unexpected error in get issue:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

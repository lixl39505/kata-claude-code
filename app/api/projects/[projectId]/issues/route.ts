import { NextRequest, NextResponse } from 'next/server';
import {
  createIssueInProject,
  listIssuesForProject,
} from '@/lib/services/issue';
import { createIssueSchema, projectIdSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate params
    const { projectId } = await params;
    const validatedParams = projectIdSchema.parse({ projectId });

    const body = await request.json();

    // Validate input
    const validatedData = createIssueSchema.parse(body);

    // Create issue
    const issue = await createIssueInProject(
      validatedParams.projectId,
      validatedData
    );

    return NextResponse.json(issue, { status: 201 });
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
            : error.code === 'CONFLICT'
            ? 409
            : 500,
      });
    }

    console.error('Unexpected error in create issue:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate params
    const { projectId } = await params;
    const validatedParams = projectIdSchema.parse({ projectId });

    // List issues for project
    const issues = await listIssuesForProject(validatedParams.projectId);

    return NextResponse.json(issues);
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

    console.error('Unexpected error in list issues:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

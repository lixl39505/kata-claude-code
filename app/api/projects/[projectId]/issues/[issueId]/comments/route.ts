import { NextRequest, NextResponse } from 'next/server';
import {
  createCommentInIssue,
  listCommentsForIssue,
} from '@/lib/services/issue-comment';
import { projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { createCommentSchema } from '@/lib/validators/issue-comment';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

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
    // Handle Zod validation errors
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

    // Handle application errors
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

    // Handle unexpected errors
    console.error('Unexpected error in create comment:', error);
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
    // Handle Zod validation errors
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

    // Handle application errors
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

    // Handle unexpected errors
    console.error('Unexpected error in list comments:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

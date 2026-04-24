import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { updateIssue as updateIssueService } from '@/lib/services/issue';
import { updateIssueSchema } from '@/lib/validators/issue';
import { AppError } from '@/lib/errors/helpers';
import { getDb } from '@/lib/db';
import { findIssueById } from '@/lib/db/issues';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    // Get issueId from params
    const issueId = params.id;

    // First, fetch the issue to get its projectId
    const issue = findIssueById(db, issueId);
    if (!issue) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const projectId = issue.projectId;

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = updateIssueSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Call service layer to update issue
    const updatedIssue = await updateIssueService(projectId, issueId, data);

    return NextResponse.json({
      success: true,
      data: updatedIssue,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.flatten().fieldErrors,
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
            : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'CONFLICT'
            ? 409
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in update issue:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

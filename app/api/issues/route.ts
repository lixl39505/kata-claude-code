import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/helpers';
import { listIssuesWithFilters, batchUpdateIssues } from '@/lib/services/issue';
import { issueFiltersSchema, batchUpdateIssuesSchema } from '@/lib/validators/issue';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
      status: searchParams.get('status') as 'OPEN' | 'IN_PROGRESS' | 'DONE' | undefined,
      assigneeId: searchParams.get('assigneeId') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    // Validate filters
    const validatedFilters = issueFiltersSchema.parse(filters);

    // Query issues with filters
    const result = await listIssuesWithFilters(validatedFilters);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as { issues?: unknown };
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
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
            : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'CONFLICT'
            ? 409
            : 500,
      });
    }

    console.error('Unexpected error in list issues with filters:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = batchUpdateIssuesSchema.parse(body);

    // Perform batch update
    const result = await batchUpdateIssues(validatedData);

    return NextResponse.json(result);
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
            : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in batch update issues:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
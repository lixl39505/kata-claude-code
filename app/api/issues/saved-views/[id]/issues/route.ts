import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/helpers';
import { getFiltersFromSavedView } from '@/lib/services/saved-view';
import { listIssuesWithFilters } from '@/lib/services/issue';
import { savedViewIssuesQuerySchema } from '@/lib/validators/saved-view';

// GET /api/issues/saved-views/:id/issues - Get issues using a saved view's filters
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    // Validate query parameters
    const validatedQuery = savedViewIssuesQuerySchema.parse(queryParams);

    // Get filters from saved view (includes ownership check)
    const filters = await getFiltersFromSavedView(id);

    // Merge saved view filters with query parameters for pagination
    const mergedFilters = {
      ...filters,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    };

    // Query issues with filters
    const result = await listIssuesWithFilters(mergedFilters);

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
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in get issues from saved view:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

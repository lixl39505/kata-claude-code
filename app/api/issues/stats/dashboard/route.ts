import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/helpers';
import { getDashboardStats } from '@/lib/services/issue';
import { dashboardStatsSchema } from '@/lib/validators/issue';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
    };

    // Validate filters
    const validatedFilters = dashboardStatsSchema.parse(filters);

    // Get dashboard statistics
    const result = await getDashboardStats(validatedFilters);

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
            : 500,
      });
    }

    console.error('Unexpected error in get dashboard stats:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

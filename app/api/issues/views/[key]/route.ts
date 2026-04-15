import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/helpers';
import { getPresetViewResults } from '@/lib/services/issue';
import { presetViewParamsSchema } from '@/lib/validators/issue';

// GET /api/issues/views/:key - Get preset view results by key
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Extract key from route params and pagination from query params
    const { key } = params;
    const searchParams = request.nextUrl.searchParams;

    const viewParams = {
      key: key as 'MY_ISSUES' | 'OPEN_ISSUES' | 'CLOSED_ISSUES',
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    // Validate parameters
    const validatedParams = presetViewParamsSchema.parse(viewParams);

    // Get preset view results
    const result = await getPresetViewResults(validatedParams);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as { issues?: unknown };
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid view parameters',
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

    console.error('Unexpected error in get preset view results:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
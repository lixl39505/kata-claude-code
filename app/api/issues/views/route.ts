import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/helpers';
import { getPresetViews } from '@/lib/services/issue';

// GET /api/issues/views - Get list of available preset views
export async function GET(_request: NextRequest) {
  try {
    const views = getPresetViews();

    return NextResponse.json({
      items: views,
    });
  } catch (error) {
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

    console.error('Unexpected error in get preset views:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
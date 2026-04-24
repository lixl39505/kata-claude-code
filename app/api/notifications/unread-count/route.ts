import { NextRequest, NextResponse } from 'next/server';
import { getUnreadCount } from '@/lib/services/notification';
import { AppError } from '@/lib/errors/helpers';

export async function GET(_request: NextRequest) {
  try {
    const count = await getUnreadCount();

    return NextResponse.json({ count });
  } catch (error) {
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

    console.error('Unexpected error in get unread count:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { listNotifications } from '@/lib/services/notification';
import { listNotificationsSchema } from '@/lib/validators/notification';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validatedData = listNotificationsSchema.parse({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      isRead: searchParams.get('isRead') || undefined,
    });

    const result = await listNotifications(validatedData);

    return NextResponse.json(result);
  } catch (error) {
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

    console.error('Unexpected error in list notifications:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

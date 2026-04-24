import { NextRequest, NextResponse } from 'next/server';
import { markNotificationsAsRead } from '@/lib/services/notification';
import { markNotificationsAsReadSchema } from '@/lib/validators/notification';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const validatedData = markNotificationsAsReadSchema.parse(body);

    const updatedCount = await markNotificationsAsRead(validatedData.ids);

    return NextResponse.json({
      success: true,
      updatedCount,
    });
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
            : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in mark notifications as read:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/lib/services/notification';
import { notificationIdSchema } from '@/lib/validators/notification';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validatedParams = notificationIdSchema.parse({
      notificationId: id,
    });

    const notification = await markNotificationAsRead(validatedParams.notificationId);

    return NextResponse.json({
      success: true,
      notification,
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

    console.error('Unexpected error in mark notification as read:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

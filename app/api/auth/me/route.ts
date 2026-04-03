import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { AppError } from '@/lib/errors/helpers';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'VALIDATION_ERROR'
            ? 400
            : 500,
      });
    }

    console.error('Unexpected error in me:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { logout } from '@/lib/services/auth';
import { AppError } from '@/lib/errors/helpers';

export async function POST() {
  try {
    await logout();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, { status: 500 });
    }

    console.error('Unexpected error in logout:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

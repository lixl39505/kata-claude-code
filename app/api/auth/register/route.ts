import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/services/auth';
import { registerSchema } from '@/lib/validators/auth';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Register user
    const user = await register(validatedData);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as { issues?: unknown };
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: zodError.issues || error.toString(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'VALIDATION_ERROR'
            ? 400
            : error.code === 'CONFLICT'
            ? 409
            : 500,
      });
    }

    console.error('Unexpected error in register:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

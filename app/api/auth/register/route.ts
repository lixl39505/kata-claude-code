import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/services/auth';
import { registerSchema } from '@/lib/validators/auth';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Register user
    const user = await register(validatedData);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'register');
  }
}

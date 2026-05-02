import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/services/auth';
import { loginSchema } from '@/lib/validators/auth';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = loginSchema.parse(body);

    // Login user
    const user = await login(validatedData.email, validatedData.password);

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, 'login');
  }
}

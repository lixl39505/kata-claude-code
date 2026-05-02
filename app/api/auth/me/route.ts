import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/services/auth';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, 'me');
  }
}

import { NextResponse } from 'next/server';
import { logout } from '@/lib/services/auth';
import { handleApiError } from '@/lib/errors';

export async function POST() {
  try {
    await logout();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'logout');
  }
}

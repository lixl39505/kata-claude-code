import { NextRequest, NextResponse } from 'next/server';
import { getUnreadCount } from '@/lib/services/notification';
import { handleApiError } from '@/lib/errors';

export async function GET(_request: NextRequest) {
  try {
    const count = await getUnreadCount();

    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error, 'getUnreadCount');
  }
}

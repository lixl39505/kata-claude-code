import { NextRequest, NextResponse } from 'next/server';
import { listNotifications } from '@/lib/services/notification';
import { listNotificationsSchema } from '@/lib/validators/notification';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validatedData = listNotificationsSchema.parse({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      isRead: searchParams.get('isRead') || undefined,
    });

    const result = await listNotifications(validatedData);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'listNotifications');
  }
}

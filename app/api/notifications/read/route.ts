import { NextRequest, NextResponse } from 'next/server';
import { markNotificationsAsRead } from '@/lib/services/notification';
import { markNotificationsAsReadSchema } from '@/lib/validators/notification';
import { handleApiError } from '@/lib/errors';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const validatedData = markNotificationsAsReadSchema.parse(body);

    const updatedCount = await markNotificationsAsRead(validatedData.ids);

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    return handleApiError(error, 'markNotificationsAsRead');
  }
}

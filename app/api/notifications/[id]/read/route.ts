import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/lib/services/notification';
import { notificationIdSchema } from '@/lib/validators/notification';
import { handleApiError } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validatedParams = notificationIdSchema.parse({
      notificationId: id,
    });

    const notification = await markNotificationAsRead(validatedParams.notificationId);

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    return handleApiError(error, 'markNotificationAsRead');
  }
}

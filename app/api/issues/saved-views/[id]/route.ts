import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/helpers';
import { deleteSavedView } from '@/lib/services/saved-view';

// DELETE /api/issues/saved-views/:id - Delete a saved view
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete saved view
    await deleteSavedView(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'NOT_FOUND'
            ? 404
            : 500,
      });
    }

    console.error('Unexpected error in delete saved view:', error);
    return NextResponse.json(
      { code: 'INTERNAL', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

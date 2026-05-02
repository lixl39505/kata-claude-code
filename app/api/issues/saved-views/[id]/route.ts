import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
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
    return handleApiError(error, 'deleteSavedView');
  }
}

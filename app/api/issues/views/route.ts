import { NextRequest, NextResponse } from 'next/server';
import { getPresetViews } from '@/lib/services/issue';
import { handleApiError } from '@/lib/errors';

// GET /api/issues/views - Get list of available preset views
export async function GET(_request: NextRequest) {
  try {
    const views = getPresetViews();

    return NextResponse.json({
      items: views,
    });
  } catch (error) {
    return handleApiError(error, 'getPresetViews');
  }
}
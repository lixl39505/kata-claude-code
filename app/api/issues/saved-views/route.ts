import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { createSavedViewForUser, listSavedViewsForUser } from '@/lib/services/saved-view';
import { createSavedViewSchema, listSavedViewsSchema } from '@/lib/validators/saved-view';

// POST /api/issues/saved-views - Create a new saved view
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = createSavedViewSchema.parse(body);

    // Create saved view
    const savedView = await createSavedViewForUser(validatedData);

    return NextResponse.json({
      id: savedView.id,
      name: savedView.name,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'createSavedView');
  }
}

// GET /api/issues/saved-views - List saved views for current user
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const listParams = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    // Validate parameters
    const validatedParams = listSavedViewsSchema.parse(listParams);

    // List saved views
    const result = await listSavedViewsForUser(validatedParams);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'listSavedViews');
  }
}

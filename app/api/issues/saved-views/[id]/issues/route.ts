import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { getFiltersFromSavedView } from '@/lib/services/saved-view';
import { listIssuesWithFilters } from '@/lib/services/issue';
import { savedViewIssuesQuerySchema } from '@/lib/validators/saved-view';

// GET /api/issues/saved-views/:id/issues - Get issues using a saved view's filters
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    // Validate query parameters
    const validatedQuery = savedViewIssuesQuerySchema.parse(queryParams);

    // Get filters from saved view (includes ownership check)
    const filters = await getFiltersFromSavedView(id);

    // Merge saved view filters with query parameters for pagination
    const mergedFilters = {
      ...filters,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    };

    // Query issues with filters
    const result = await listIssuesWithFilters(mergedFilters);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'getIssuesBySavedView');
  }
}

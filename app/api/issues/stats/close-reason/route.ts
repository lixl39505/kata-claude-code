import { NextRequest, NextResponse } from 'next/server';
import { getCloseReasonStats } from '@/lib/services/issue';
import { closeReasonStatsSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
    };

    // Validate filters
    const validatedFilters = closeReasonStatsSchema.parse(filters);

    // Get close reason statistics
    const result = await getCloseReasonStats(validatedFilters);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'getCloseReasonStats');
  }
}

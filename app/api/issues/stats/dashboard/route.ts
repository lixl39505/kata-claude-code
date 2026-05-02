import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/services/issue';
import { dashboardStatsSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
    };

    // Validate filters
    const validatedFilters = dashboardStatsSchema.parse(filters);

    // Get dashboard statistics
    const result = await getDashboardStats(validatedFilters);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'getDashboardStats');
  }
}

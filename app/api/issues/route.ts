import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { listIssuesWithFilters, batchUpdateIssues } from '@/lib/services/issue';
import { issueFiltersSchema, batchUpdateIssuesSchema } from '@/lib/validators/issue';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
      state: searchParams.get('state') as 'OPEN' | 'CLOSED' | undefined,
      assigneeId: searchParams.get('assigneeId') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      sortBy: searchParams.get('sortBy') as 'createdAt' | undefined,
      order: searchParams.get('order') as 'asc' | 'desc' | undefined,
    };

    // Validate filters
    const validatedFilters = issueFiltersSchema.parse(filters);

    // Query issues with filters
    const result = await listIssuesWithFilters(validatedFilters);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'listIssues');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = batchUpdateIssuesSchema.parse(body);

    // Perform batch update
    const result = await batchUpdateIssues(validatedData);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'batchUpdateIssues');
  }
}
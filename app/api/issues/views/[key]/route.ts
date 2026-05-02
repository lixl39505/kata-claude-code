import { NextRequest, NextResponse } from 'next/server';
import { getPresetViewResults } from '@/lib/services/issue';
import { presetViewParamsSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

// GET /api/issues/views/:key - Get preset view results by key
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Extract key from route params and pagination from query params
    const { key } = params;
    const searchParams = request.nextUrl.searchParams;

    const viewParams = {
      key: key as 'MY_ISSUES' | 'OPEN_ISSUES' | 'CLOSED_ISSUES',
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    // Validate parameters
    const validatedParams = presetViewParamsSchema.parse(viewParams);

    // Get preset view results
    const result = await getPresetViewResults(validatedParams);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'getPresetViewResults');
  }
}
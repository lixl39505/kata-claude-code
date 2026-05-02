import { NextRequest, NextResponse } from 'next/server';
import { getProjectByIdForCurrentUser } from '@/lib/services/project';
import { projectIdSchema } from '@/lib/validators/project';
import { handleApiError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate params
    const { projectId } = await params;
    const validatedParams = projectIdSchema.parse({ projectId });

    // Get project
    const project = await getProjectByIdForCurrentUser(
      validatedParams.projectId
    );

    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error, 'getProjectById');
  }
}

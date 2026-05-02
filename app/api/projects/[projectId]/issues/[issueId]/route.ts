import { NextRequest, NextResponse } from 'next/server';
import { getIssueByIdForProject } from '@/lib/services/issue';
import { issueIdSchema, projectIdSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  try {
    // Validate params
    const { projectId, issueId } = await params;
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
    };

    // Get issue
    const issue = await getIssueByIdForProject(
      validatedParams.projectId,
      validatedParams.issueId
    );

    return NextResponse.json(issue);
  } catch (error) {
    return handleApiError(error, 'getIssueById');
  }
}

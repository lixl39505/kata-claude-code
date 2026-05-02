import { NextRequest, NextResponse } from 'next/server';
import { updateIssueState } from '@/lib/services/issue';
import { updateIssueStateSchema, projectIdSchema, issueIdSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  try {
    const { projectId, issueId } = await params;
    const validatedParams = {
      ...projectIdSchema.parse({ projectId }),
      ...issueIdSchema.parse({ issueId }),
    };

    const body = await request.json();
    const validatedData = updateIssueStateSchema.parse(body);

    const issue = await updateIssueState(
      validatedParams.projectId,
      validatedParams.issueId,
      validatedData
    );

    return NextResponse.json(issue);
  } catch (error) {
    return handleApiError(error, 'updateIssueState');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { updateIssue as updateIssueService, getIssueByIdForUpdate } from '@/lib/services/issue';
import { updateIssueSchema } from '@/lib/validators/issue';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get issueId from params
    const issueId = params.id;

    // First, fetch the issue using service layer (includes authorization)
    const issue = await getIssueByIdForUpdate(issueId);
    const projectId = issue.projectId;

    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = updateIssueSchema.parse(body);

    // Call service layer to update issue
    const updatedIssue = await updateIssueService(projectId, issueId, validatedData);

    return NextResponse.json({
      success: true,
      data: updatedIssue,
    });
  } catch (error) {
    return handleApiError(error, 'updateIssue');
  }
}

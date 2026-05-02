import { NextRequest, NextResponse } from 'next/server';
import {
  createIssueInProject,
  listIssuesForProject,
} from '@/lib/services/issue';
import { createIssueSchema, projectIdSchema } from '@/lib/validators/issue';
import { handleApiError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate params
    const { projectId } = await params;
    const validatedParams = projectIdSchema.parse({ projectId });

    const body = await request.json();

    // Validate input
    const validatedData = createIssueSchema.parse(body);

    // Create issue
    const issue = await createIssueInProject(
      validatedParams.projectId,
      validatedData
    );

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'createIssue');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate params
    const { projectId } = await params;
    const validatedParams = projectIdSchema.parse({ projectId });

    // List issues for project
    const issues = await listIssuesForProject(validatedParams.projectId);

    return NextResponse.json(issues);
  } catch (error) {
    return handleApiError(error, 'listIssues');
  }
}

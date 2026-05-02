import { NextRequest, NextResponse } from 'next/server';
import {
  createProject,
  listProjectsForCurrentUser,
} from '@/lib/services/project';
import { createProjectSchema } from '@/lib/validators/project';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createProjectSchema.parse(body);

    // Create project
    const project = await createProject(validatedData);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'createProject');
  }
}

export async function GET(_request: NextRequest) {
  try {
    // List projects for current user
    const projects = await listProjectsForCurrentUser();

    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error, 'listProjects');
  }
}

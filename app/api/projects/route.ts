import { NextRequest, NextResponse } from 'next/server';
import {
  createProject,
  listProjectsForCurrentUser,
} from '@/lib/services/project';
import { createProjectSchema } from '@/lib/validators/project';
import { AppError } from '@/lib/errors/helpers';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createProjectSchema.parse(body);

    // Create project
    const project = await createProject(validatedData);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as { issues?: unknown };
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: zodError.issues || error.toString(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status:
          error.code === 'UNAUTHENTICATED'
            ? 401
            : error.code === 'CONFLICT'
            ? 409
            : 500,
      });
    }

    console.error('Unexpected error in create project:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    // List projects for current user
    const projects = await listProjectsForCurrentUser();

    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof AppError) {
      const apiError = error.toApiError();
      return NextResponse.json(apiError, {
        status: error.code === 'UNAUTHENTICATED' ? 401 : 500,
      });
    }

    console.error('Unexpected error in list projects:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

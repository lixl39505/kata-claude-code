import { getDb } from '@/lib/db';
import {
  createProject as createProjectDb,
  findProjectById,
  findProjectsByOwnerId,
  findProjectByOwnerAndKey,
} from '@/lib/db/projects';
import { requireAuthenticatedUser } from './auth';
import { ConflictError, NotFoundError } from '@/lib/errors/helpers';
import type { CreateProjectInput } from '@/lib/validators/project';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Check for duplicate key within user's projects
  const existingProject = findProjectByOwnerAndKey(db, user.id, data.key);
  if (existingProject) {
    throw new ConflictError('A project with this key already exists');
  }

  // Create project
  const project = createProjectDb(db, {
    ownerId: user.id,
    name: data.name,
    key: data.key,
    description: data.description ?? null,
  });

  return project;
}

export async function listProjectsForCurrentUser(): Promise<Project[]> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // List all projects for the user
  const projects = findProjectsByOwnerId(db, user.id);

  return projects;
}

export async function getProjectByIdForCurrentUser(projectId: string): Promise<Project> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Find project by ID
  const project = findProjectById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Verify ownership
  if (project.ownerId !== user.id) {
    throw new NotFoundError('Project');
  }

  return project;
}

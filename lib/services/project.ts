import { getDb } from '@/lib/db';
import { executeInTransactionAsync } from '@/lib/db/transaction';
import {
  createProject as createProjectDb,
  findProjectById,
  findProjectByOwnerAndKey,
} from '@/lib/db/projects';
import { addProjectMember as addProjectMemberDb, findProjectIdsByUserId } from '@/lib/db/project-members';
import { requireAuthenticatedUser } from './auth';
import { ConflictError, NotFoundError, ForbiddenError } from '@/lib/errors/helpers';
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

  // Use transaction to ensure atomicity of project creation and owner membership
  return executeInTransactionAsync(db, (txnDb) => {
    // Create project
    const project = createProjectDb(txnDb, {
      ownerId: user.id,
      name: data.name,
      key: data.key,
      description: data.description ?? null,
    });

    // Auto-create creator as OWNER member
    addProjectMemberDb(txnDb, {
      projectId: project.id,
      userId: user.id,
      role: 'OWNER',
    });

    return project;
  });
}

export async function listProjectsForCurrentUser(): Promise<Project[]> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Get all project IDs where user is a member
  const memberProjectIds = findProjectIdsByUserId(db, user.id);

  // Fetch all projects where user is a member
  const projects: Project[] = [];
  for (const projectId of memberProjectIds) {
    const project = findProjectById(db, projectId);
    if (project) {
      projects.push(project);
    }
  }

  // Sort by creation date (newest first)
  projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

  // Check if user is a member (owner or regular member)
  const { isProjectMember } = await import('./project-members');
  if (!isProjectMember(projectId, user.id)) {
    throw new ForbiddenError('You do not have access to this project');
  }

  return project;
}

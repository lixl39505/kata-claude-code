import { getDb } from '@/lib/db';
import {
  createSavedView,
  findSavedViewsByUserId,
  countSavedViewsByUserId,
  findSavedViewById,
  findSavedViewByUserIdAndName,
  deleteSavedViewByIdAndUserId,
} from '@/lib/db/saved-views';
import { requireAuthenticatedUser } from './auth';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import type { CreateSavedViewInput, ListSavedViewsInput } from '@/lib/validators/saved-view';
import type { IssueFiltersInput } from '@/lib/validators/issue';

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filtersJson: string;
  createdAt: string;
}

export interface SavedViewWithFilters extends SavedView {
  filters: IssueFiltersInput;
}

/**
 * Create a new saved view for the current user.
 *
 * @param data - The saved view data
 * @returns The created saved view
 * @throws ValidationError if view name already exists for the user
 */
export async function createSavedViewForUser(
  data: CreateSavedViewInput
): Promise<SavedView> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Check if a view with the same name already exists for this user
  const existingView = findSavedViewByUserIdAndName(db, user.id, data.name);
  if (existingView) {
    throw new ValidationError('A view with this name already exists');
  }

  // Serialize filters to JSON
  const filtersJson = JSON.stringify(data.filters);

  // Create the saved view
  const savedView = createSavedView(db, {
    userId: user.id,
    name: data.name,
    filtersJson,
  });

  return savedView;
}

/**
 * List saved views for the current user with pagination.
 *
 * @param params - Pagination parameters
 * @returns Array of saved views with total count
 */
export async function listSavedViewsForUser(
  params: Partial<ListSavedViewsInput> = {}
): Promise<{ items: SavedViewWithFilters[]; total: number }> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Apply defaults
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  // Get saved views
  const savedViews = findSavedViewsByUserId(db, user.id, limit, offset);

  // Get total count
  const total = countSavedViewsByUserId(db, user.id);

  // Parse filters JSON for each view
  const items = savedViews.map((view) => ({
    ...view,
    filters: JSON.parse(view.filtersJson) as IssueFiltersInput,
  }));

  return { items, total };
}

/**
 * Get a saved view by ID.
 * Only returns the view if it belongs to the current user.
 *
 * @param viewId - The ID of the saved view
 * @returns The saved view with parsed filters
 * @throws NotFoundError if view not found
 * @throws ForbiddenError if view does not belong to current user
 */
export async function getSavedViewById(viewId: string): Promise<SavedViewWithFilters> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Find the saved view
  const savedView = findSavedViewById(db, viewId);
  if (!savedView) {
    throw new NotFoundError('Saved View');
  }

  // Verify ownership
  if (savedView.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this saved view');
  }

  // Parse filters JSON
  const filters = JSON.parse(savedView.filtersJson) as IssueFiltersInput;

  return {
    ...savedView,
    filters,
  };
}

/**
 * Delete a saved view by ID.
 * Only deletes the view if it belongs to the current user.
 *
 * @param viewId - The ID of the saved view
 * @throws NotFoundError if view not found
 * @throws ForbiddenError if view does not belong to current user
 */
export async function deleteSavedView(viewId: string): Promise<void> {
  const db = getDb();

  // Get current user
  const user = await requireAuthenticatedUser();

  // Verify the view exists and belongs to the user
  const savedView = findSavedViewById(db, viewId);
  if (!savedView) {
    throw new NotFoundError('Saved View');
  }

  if (savedView.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this saved view');
  }

  // Delete the view
  const deleted = deleteSavedViewByIdAndUserId(db, viewId, user.id);
  if (!deleted) {
    throw new NotFoundError('Saved View');
  }
}

/**
 * Get filters from a saved view by ID.
 * Only returns filters if the view belongs to the current user.
 *
 * @param viewId - The ID of the saved view
 * @returns The filters from the saved view
 * @throws NotFoundError if view not found
 * @throws ForbiddenError if view does not belong to current user
 */
export async function getFiltersFromSavedView(viewId: string): Promise<IssueFiltersInput> {
  const savedView = await getSavedViewById(viewId);
  return savedView.filters;
}

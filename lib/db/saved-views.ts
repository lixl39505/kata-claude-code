import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filtersJson: string;
  createdAt: string;
}

export interface SavedViewData {
  userId: string;
  name: string;
  filtersJson: string;
}

export interface SavedViewWithFilters extends SavedView {
  filters: {
    projectId?: string;
    state?: 'OPEN' | 'CLOSED';
    assigneeId?: string;
    sortBy?: string;
    order?: string;
  };
}

/**
 * Create a new saved view.
 *
 * @param db - The database instance
 * @param data - The saved view data
 * @returns The created saved view
 */
export function createSavedView(
  db: Database.Database,
  data: SavedViewData
): SavedView {
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO saved_views (id, user_id, name, filters_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.userId, data.name, data.filtersJson, now);

  return {
    id,
    userId: data.userId,
    name: data.name,
    filtersJson: data.filtersJson,
    createdAt: now,
  };
}

/**
 * Find saved views for a user with pagination.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @param limit - Maximum number of views to return
 * @param offset - Number of views to skip
 * @returns Array of saved views
 */
export function findSavedViewsByUserId(
  db: Database.Database,
  userId: string,
  limit = 50,
  offset = 0
): SavedView[] {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      name,
      filters_json as filtersJson,
      created_at as createdAt
    FROM saved_views
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(userId, limit, offset) as SavedView[];
}

/**
 * Count saved views for a user.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @returns The count of saved views
 */
export function countSavedViewsByUserId(
  db: Database.Database,
  userId: string
): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM saved_views
    WHERE user_id = ?
  `);

  const result = stmt.get(userId) as { count: number };
  return result.count;
}

/**
 * Find a saved view by ID.
 *
 * @param db - The database instance
 * @param viewId - The ID of the saved view
 * @returns The saved view or null if not found
 */
export function findSavedViewById(
  db: Database.Database,
  viewId: string
): SavedView | null {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      name,
      filters_json as filtersJson,
      created_at as createdAt
    FROM saved_views
    WHERE id = ?
  `);

  const result = stmt.get(viewId) as SavedView | undefined;
  return result || null;
}

/**
 * Find a saved view by user ID and name.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @param name - The name of the saved view
 * @returns The saved view or null if not found
 */
export function findSavedViewByUserIdAndName(
  db: Database.Database,
  userId: string,
  name: string
): SavedView | null {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      name,
      filters_json as filtersJson,
      created_at as createdAt
    FROM saved_views
    WHERE user_id = ? AND name = ?
  `);

  const result = stmt.get(userId, name) as SavedView | undefined;
  return result || null;
}

/**
 * Delete a saved view by ID.
 *
 * @param db - The database instance
 * @param viewId - The ID of the saved view
 * @returns true if deleted, false if not found
 */
export function deleteSavedViewById(
  db: Database.Database,
  viewId: string
): boolean {
  const stmt = db.prepare(`
    DELETE FROM saved_views
    WHERE id = ?
  `);

  const result = stmt.run(viewId);
  return result.changes > 0;
}

/**
 * Delete a saved view by ID and user ID (for security isolation).
 *
 * @param db - The database instance
 * @param viewId - The ID of the saved view
 * @param userId - The ID of the user (to ensure ownership)
 * @returns true if deleted, false if not found or not owned by user
 */
export function deleteSavedViewByIdAndUserId(
  db: Database.Database,
  viewId: string,
  userId: string
): boolean {
  const stmt = db.prepare(`
    DELETE FROM saved_views
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(viewId, userId);
  return result.changes > 0;
}

/**
 * Delete all saved views for a user.
 * This is typically handled by cascade delete when user is deleted.
 *
 * @param db - The database instance
 * @param userId - The ID of the user
 * @returns Number of deleted saved views
 */
export function deleteSavedViewsByUserId(
  db: Database.Database,
  userId: string
): number {
  const stmt = db.prepare(`
    DELETE FROM saved_views
    WHERE user_id = ?
  `);

  const result = stmt.run(userId);
  return result.changes;
}

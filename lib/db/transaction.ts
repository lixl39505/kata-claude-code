import Database from 'better-sqlite3';

/**
 * Execute a synchronous function within a database transaction.
 * The transaction will be committed if the function succeeds,
 * or rolled back if it throws an error.
 *
 * @param db - The database instance
 * @param callback - The function to execute within the transaction
 * @returns The result of the callback function
 * @throws Error if nested transactions are attempted
 */
export function executeInTransaction<T>(
  db: Database.Database,
  callback: (db: Database.Database) => T
): T {
  // SQLite doesn't support nested transactions
  if (db.inTransaction) {
    throw new Error('Nested transactions are not supported');
  }

  const transaction = db.transaction(callback);
  return transaction(db);
}

/**
 * Execute a function within a database transaction and return a Promise.
 * The transaction will be committed if the function succeeds,
 * or rolled back if it throws an error.
 *
 * Note: better-sqlite3 transactions are synchronous. This function
 * allows using the transaction wrapper in async contexts, but the
 * callback itself must be synchronous (all database operations are
 * synchronous in better-sqlite3).
 *
 * @param db - The database instance
 * @param callback - The function to execute within the transaction (must be synchronous)
 * @returns The result of the callback function wrapped in a Promise
 * @throws Error if nested transactions are attempted
 */
export function executeInTransactionAsync<T>(
  db: Database.Database,
  callback: (db: Database.Database) => T
): Promise<T> {
  // SQLite doesn't support nested transactions
  if (db.inTransaction) {
    throw new Error('Nested transactions are not supported');
  }

  try {
    const transaction = db.transaction(callback);
    return Promise.resolve(transaction(db));
  } catch (error) {
    return Promise.reject(error);
  }
}

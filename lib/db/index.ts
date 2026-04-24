import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
export { executeInTransaction, executeInTransactionAsync } from './transaction';
export * from './project-members';
export * from './issue-comment-mentions';
export * from './notifications';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initializeDatabase(): void {
  const database = getDb();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Read and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    database.exec(schema);
  }
}

import Database from 'better-sqlite3';
import { executeInTransaction, executeInTransactionAsync } from '@/lib/db/transaction';

describe('Transaction Support', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');
    db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)');
  });

  afterEach(() => {
    db.close();
  });

  describe('executeInTransaction', () => {
    it('should commit transaction when callback succeeds', () => {
      executeInTransaction(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
      });

      const row = db.prepare('SELECT * FROM test_table WHERE id = ?').get(1);
      expect(row).toBeDefined();
      expect(row).toEqual({ id: 1, value: 'test' });
    });

    it('should rollback transaction when callback throws', () => {
      expect(() => {
        executeInTransaction(db, (txnDb) => {
          txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const row = db.prepare('SELECT * FROM test_table WHERE id = ?').get(1);
      expect(row).toBeUndefined();
    });

    it('should throw error when attempting nested transaction', () => {
      expect(() => {
        executeInTransaction(db, (txnDb) => {
          executeInTransaction(txnDb, () => {
            // This should throw
          });
        });
      }).toThrow('Nested transactions are not supported');
    });

    it('should return value from callback', () => {
      const result = executeInTransaction(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should handle multiple operations in single transaction', () => {
      executeInTransaction(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'first');
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(2, 'second');
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(3, 'third');
      });

      const rows = db.prepare('SELECT * FROM test_table ORDER BY id').all();
      expect(rows).toHaveLength(3);
      expect(rows).toEqual([
        { id: 1, value: 'first' },
        { id: 2, value: 'second' },
        { id: 3, value: 'third' },
      ]);
    });
  });

  describe('executeInTransactionAsync', () => {
    it('should commit transaction when callback succeeds', async () => {
      await executeInTransactionAsync(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
      });

      const row = db.prepare('SELECT * FROM test_table WHERE id = ?').get(1);
      expect(row).toBeDefined();
      expect(row).toEqual({ id: 1, value: 'test' });
    });

    it('should rollback transaction when callback throws', async () => {
      await expect(
        executeInTransactionAsync(db, (txnDb) => {
          txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Verify rollback - the insert should not have persisted
      const row = db.prepare('SELECT * FROM test_table WHERE id = ?').get(1);
      expect(row).toBeUndefined();
    });

    it('should throw error when attempting nested async transaction', async () => {
      let errorThrown = false;
      try {
        await executeInTransactionAsync(db, (txnDb) => {
          // Try to start a nested transaction
          executeInTransactionAsync(txnDb, () => {
            // This should throw
          });
        });
      } catch (error) {
        errorThrown = true;
        expect(error).toEqual(new Error('Nested transactions are not supported'));
      }
      expect(errorThrown).toBe(true);
    });

    it('should return value from callback', async () => {
      const result = await executeInTransactionAsync(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should handle multiple operations in single transaction', async () => {
      await executeInTransactionAsync(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'first');
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(2, 'second');
      });

      const rows = db.prepare('SELECT * FROM test_table ORDER BY id').all();
      expect(rows).toHaveLength(2);
      expect(rows).toEqual([
        { id: 1, value: 'first' },
        { id: 2, value: 'second' },
      ]);
    });

    it('should return a Promise', async () => {
      const result = executeInTransactionAsync(db, (txnDb) => {
        txnDb.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run(1, 'test');
        return 42;
      });

      expect(result).toBeInstanceOf(Promise);
      const value = await result;
      expect(value).toBe(42);
    });
  });

  describe('Transaction state', () => {
    it('should detect transaction is in progress', () => {
      expect(db.inTransaction).toBe(false);

      executeInTransaction(db, (txnDb) => {
        expect(txnDb.inTransaction).toBe(true);
      });

      expect(db.inTransaction).toBe(false);
    });

    it('should detect async transaction is in progress', async () => {
      expect(db.inTransaction).toBe(false);

      await executeInTransactionAsync(db, (txnDb) => {
        expect(txnDb.inTransaction).toBe(true);
      });

      expect(db.inTransaction).toBe(false);
    });
  });
});

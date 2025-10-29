// Batch Operations Service
// Provides optimized bulk operations for database operations

export interface BatchOperation<T = any> {
  query: string;
  params: any[];
  metadata?: T;
}

export interface BatchResult<T = any> {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ index: number; error: string; metadata?: T }>;
}

/**
 * Batch service for optimized bulk operations
 * Handles transaction batching, error recovery, and progress tracking
 */
export class BatchService {
  private db: D1Database;
  private batchSize: number;

  constructor(db: D1Database, batchSize: number = 100) {
    this.db = db;
    this.batchSize = batchSize;
  }

  /**
   * Execute multiple operations in batches within transactions
   */
  async executeBatch<T = any>(
    operations: BatchOperation<T>[]
  ): Promise<BatchResult<T>> {
    const result: BatchResult<T> = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    // Split into chunks
    const chunks = this.chunkArray(operations, this.batchSize);

    for (const chunk of chunks) {
      try {
        // Execute chunk in transaction
        const statements = chunk.map((op) =>
          this.db.prepare(op.query).bind(...op.params)
        );

        await this.db.batch(statements);
        result.processed += chunk.length;
      } catch (error: any) {
        // If batch fails, try operations individually to identify failures
        result.success = false;
        await this.retryIndividually(chunk, result);
      }
    }

    return result;
  }

  /**
   * Retry failed batch operations individually
   */
  private async retryIndividually<T>(
    operations: BatchOperation<T>[],
    result: BatchResult<T>
  ): Promise<void> {
    for (let i = 0; i < operations.length; i++) {
      try {
        await this.db
          .prepare(operations[i].query)
          .bind(...operations[i].params)
          .run();
        result.processed++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error.message || 'Unknown error',
          metadata: operations[i].metadata,
        });
      }
    }
  }

  /**
   * Bulk insert with conflict resolution
   */
  async bulkInsert(
    tableName: string,
    records: Record<string, any>[],
    onConflict: 'IGNORE' | 'REPLACE' | 'UPDATE' = 'IGNORE'
  ): Promise<BatchResult> {
    if (records.length === 0) {
      return { success: true, processed: 0, failed: 0, errors: [] };
    }

    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');

    let query = `INSERT OR ${onConflict} INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    const operations: BatchOperation[] = records.map((record) => ({
      query,
      params: columns.map((col) => record[col]),
      metadata: record,
    }));

    return this.executeBatch(operations);
  }

  /**
   * Bulk update by primary key
   */
  async bulkUpdate(
    tableName: string,
    records: Array<{ id: number | string; updates: Record<string, any> }>,
    idColumn: string = 'id'
  ): Promise<BatchResult> {
    if (records.length === 0) {
      return { success: true, processed: 0, failed: 0, errors: [] };
    }

    const operations: BatchOperation[] = records.map((record) => {
      const columns = Object.keys(record.updates);
      const setClause = columns.map((col) => `${col} = ?`).join(', ');
      const query = `UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = ?`;
      const params = [...columns.map((col) => record.updates[col]), record.id];

      return {
        query,
        params,
        metadata: record,
      };
    });

    return this.executeBatch(operations);
  }

  /**
   * Bulk delete by IDs
   */
  async bulkDelete(
    tableName: string,
    ids: Array<number | string>,
    idColumn: string = 'id'
  ): Promise<BatchResult> {
    if (ids.length === 0) {
      return { success: true, processed: 0, failed: 0, errors: [] };
    }

    // Use IN clause for better performance
    const chunks = this.chunkArray(ids, this.batchSize);
    const result: BatchResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    for (const chunk of chunks) {
      try {
        const placeholders = chunk.map(() => '?').join(', ');
        const query = `DELETE FROM ${tableName} WHERE ${idColumn} IN (${placeholders})`;

        await this.db.prepare(query).bind(...chunk).run();
        result.processed += chunk.length;
      } catch (error: any) {
        result.success = false;
        result.failed += chunk.length;
        result.errors.push({
          index: result.processed,
          error: error.message || 'Delete failed',
          metadata: chunk,
        });
      }
    }

    return result;
  }

  /**
   * Batch upsert - insert new records and update existing ones
   */
  async bulkUpsert(
    tableName: string,
    records: Record<string, any>[],
    conflictColumns: string[],
    updateColumns: string[]
  ): Promise<BatchResult> {
    if (records.length === 0) {
      return { success: true, processed: 0, failed: 0, errors: [] };
    }

    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const updateClause = updateColumns
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}
    `;

    const operations: BatchOperation[] = records.map((record) => ({
      query,
      params: columns.map((col) => record[col]),
      metadata: record,
    }));

    return this.executeBatch(operations);
  }

  /**
   * Execute multiple different queries in a transaction
   */
  async executeTransaction(queries: BatchOperation[]): Promise<BatchResult> {
    try {
      const statements = queries.map((op) =>
        this.db.prepare(op.query).bind(...op.params)
      );

      await this.db.batch(statements);

      return {
        success: true,
        processed: queries.length,
        failed: 0,
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        processed: 0,
        failed: queries.length,
        errors: [
          {
            index: 0,
            error: error.message || 'Transaction failed',
          },
        ],
      };
    }
  }

  /**
   * Bulk select by IDs (optimized for large ID lists)
   */
  async bulkSelect<T = any>(
    tableName: string,
    ids: Array<number | string>,
    idColumn: string = 'id',
    columns: string[] = ['*']
  ): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const results: T[] = [];
    const chunks = this.chunkArray(ids, this.batchSize);

    for (const chunk of chunks) {
      const placeholders = chunk.map(() => '?').join(', ');
      const query = `SELECT ${columns.join(', ')} FROM ${tableName} WHERE ${idColumn} IN (${placeholders})`;

      const result = await this.db.prepare(query).bind(...chunk).all<T>();
      if (result.results) {
        results.push(...result.results);
      }
    }

    return results;
  }

  /**
   * Batch archive old records (soft delete pattern)
   */
  async archiveOldRecords(
    tableName: string,
    dateColumn: string,
    olderThanDays: number,
    archiveColumn: string = 'archived'
  ): Promise<BatchResult> {
    try {
      const query = `
        UPDATE ${tableName}
        SET ${archiveColumn} = 1, updated_at = CURRENT_TIMESTAMP
        WHERE ${dateColumn} < datetime('now', '-${olderThanDays} days')
          AND ${archiveColumn} = 0
      `;

      const result = await this.db.prepare(query).run();

      return {
        success: true,
        processed: result.meta.changes || 0,
        failed: 0,
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [{ index: 0, error: error.message }],
      };
    }
  }

  /**
   * Cleanup old performance metrics
   */
  async cleanupOldMetrics(daysToKeep: number = 7): Promise<BatchResult> {
    const tables = [
      'performance_metrics',
      'audit_logs',
      'data_quality_checks',
    ];

    const operations: BatchOperation[] = tables.map((table) => ({
      query: `DELETE FROM ${table} WHERE created_at < datetime('now', '-${daysToKeep} days')`,
      params: [],
      metadata: { table },
    }));

    return this.executeBatch(operations);
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get batch statistics
   */
  getBatchStats(result: BatchResult): {
    totalOperations: number;
    successRate: number;
    failureRate: number;
  } {
    const total = result.processed + result.failed;
    return {
      totalOperations: total,
      successRate: total > 0 ? (result.processed / total) * 100 : 100,
      failureRate: total > 0 ? (result.failed / total) * 100 : 0,
    };
  }
}

/**
 * Specialized batch operations for limit calculations
 */
export class LimitBatchService extends BatchService {
  /**
   * Batch recalculate limits for multiple market indexes
   */
  async recalculateLimits(
    mktIndexes: string[],
    limitType: string,
    asOfDate: string
  ): Promise<BatchResult> {
    // This would integrate with the existing limit-calculator service
    // For now, we'll create a placeholder that marks limits for recalculation
    const operations: BatchOperation[] = mktIndexes.map((mktIndex) => ({
      query: `
        UPDATE limit_calculations
        SET needs_recalc = 1, updated_at = CURRENT_TIMESTAMP
        WHERE mkt_index = ? AND limit_type = ? AND as_of_date = ?
      `,
      params: [mktIndex, limitType, asOfDate],
      metadata: { mktIndex, limitType, asOfDate },
    }));

    return this.executeBatch(operations);
  }

  /**
   * Batch update limit statuses
   */
  async updateLimitStatuses(
    updates: Array<{
      mktIndex: string;
      status: string;
      notes?: string;
    }>
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = updates.map((update) => ({
      query: `
        UPDATE limit_calculations
        SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
        WHERE mkt_index = ? AND is_active = 1
      `,
      params: [update.status, update.notes || null, update.mktIndex],
      metadata: update,
    }));

    return this.executeBatch(operations);
  }
}

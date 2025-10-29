/**
 * Exception Handling Service
 *
 * Tracks and manages calculation exceptions for CFTC compliance
 */

export interface CalculationException {
  id?: number;
  exception_type: string;
  exception_severity: string; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  entity_type: string; // 'TRANSACTION', 'LIMIT_CALCULATION', 'POSITION', etc.
  entity_id?: number;
  exception_message: string;
  exception_details?: string;
  status: string; // 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'
  assigned_to_user_id?: number;
  resolution_notes?: string;
  detected_at?: string;
  resolved_at?: string;
  company_id?: number;
}

export class ExceptionHandlingService {
  constructor(private db: D1Database) {}

  /**
   * Log a new exception
   */
  async logException(exception: Omit<CalculationException, 'id' | 'detected_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO calculation_exceptions
         (exception_type, exception_severity, entity_type, entity_id,
          exception_message, exception_details, status, assigned_to_user_id,
          company_id, detected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        exception.exception_type,
        exception.exception_severity,
        exception.entity_type,
        exception.entity_id || null,
        exception.exception_message,
        exception.exception_details || null,
        exception.status || 'OPEN',
        exception.assigned_to_user_id || null,
        exception.company_id || null
      )
      .run();

    return result.meta.last_row_id || 0;
  }

  /**
   * Get exceptions with filters
   */
  async getExceptions(filters?: {
    status?: string;
    severity?: string;
    exception_type?: string;
    company_id?: number;
    limit?: number;
  }): Promise<CalculationException[]> {
    let query = 'SELECT * FROM calculation_exceptions WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.severity) {
      query += ' AND exception_severity = ?';
      params.push(filters.severity);
    }

    if (filters?.exception_type) {
      query += ' AND exception_type = ?';
      params.push(filters.exception_type);
    }

    if (filters?.company_id) {
      query += ' AND company_id = ?';
      params.push(filters.company_id);
    }

    query += ' ORDER BY detected_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    } else {
      query += ' LIMIT 100';
    }

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results as unknown as CalculationException[];
  }

  /**
   * Get exception by ID
   */
  async getException(id: number): Promise<CalculationException | null> {
    const result = await this.db
      .prepare('SELECT * FROM calculation_exceptions WHERE id = ?')
      .bind(id)
      .first<CalculationException>();

    return result || null;
  }

  /**
   * Update exception status
   */
  async updateExceptionStatus(
    id: number,
    status: string,
    resolutionNotes?: string,
    resolvedBy?: number
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (resolutionNotes) {
      updates.push('resolution_notes = ?');
      params.push(resolutionNotes);
    }

    if (status === 'RESOLVED') {
      updates.push("resolved_at = datetime('now')");
    }

    params.push(id);

    await this.db
      .prepare(
        `UPDATE calculation_exceptions
         SET ${updates.join(', ')}
         WHERE id = ?`
      )
      .bind(...params)
      .run();
  }

  /**
   * Assign exception to user
   */
  async assignException(id: number, userId: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE calculation_exceptions
         SET assigned_to_user_id = ?, status = 'IN_PROGRESS'
         WHERE id = ?`
      )
      .bind(userId, id)
      .run();
  }

  /**
   * Get exception statistics
   */
  async getExceptionStats(companyId?: number): Promise<any> {
    let query = `
      SELECT
        status,
        exception_severity,
        COUNT(*) as count
      FROM calculation_exceptions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }

    query += ' GROUP BY status, exception_severity';

    const result = await this.db.prepare(query).bind(...params).all();

    // Transform into a more useful format
    const stats: any = {
      by_status: {},
      by_severity: {},
      total: 0,
    };

    for (const row of result.results) {
      const r = row as any;
      stats.total += r.count;

      if (!stats.by_status[r.status]) {
        stats.by_status[r.status] = 0;
      }
      stats.by_status[r.status] += r.count;

      if (!stats.by_severity[r.exception_severity]) {
        stats.by_severity[r.exception_severity] = 0;
      }
      stats.by_severity[r.exception_severity] += r.count;
    }

    return stats;
  }

  /**
   * Delete old resolved exceptions (cleanup)
   */
  async deleteOldExceptions(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();

    const result = await this.db
      .prepare(
        `DELETE FROM calculation_exceptions
         WHERE status = 'RESOLVED' AND resolved_at < ?`
      )
      .bind(cutoffDateStr)
      .run();

    return result.meta.changes || 0;
  }
}

/**
 * Factory function to create ExceptionHandlingService instance
 */
export function createExceptionHandlingService(db: D1Database): ExceptionHandlingService {
  return new ExceptionHandlingService(db);
}

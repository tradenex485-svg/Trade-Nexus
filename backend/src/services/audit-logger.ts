// Audit Logging Service
// Tracks changes to critical data for compliance and debugging

interface AuditLogEntry {
  table_name: string;
  record_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by?: number;
  action: 'create' | 'update' | 'delete';
}

/**
 * Log a change to the market_limits_log table
 */
export async function logMarketLimitChange(
  db: any,
  marketLimitId: number,
  fieldName: string,
  oldValue: any,
  newValue: any,
  changedBy?: number
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO market_limits_log (
        market_limit_id,
        field_name,
        old_value,
        new_value,
        changed_by
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      marketLimitId,
      fieldName,
      oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
      newValue !== null && newValue !== undefined ? String(newValue) : null,
      changedBy || null
    ).run();

    console.log(`[AUDIT] Market limit ${marketLimitId} - ${fieldName}: ${oldValue} → ${newValue}`);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Log multiple field changes at once
 */
export async function logMarketLimitChanges(
  db: any,
  marketLimitId: number,
  changes: Array<{ field: string; oldValue: any; newValue: any }>,
  changedBy?: number
): Promise<void> {
  for (const change of changes) {
    await logMarketLimitChange(
      db,
      marketLimitId,
      change.field,
      change.oldValue,
      change.newValue,
      changedBy
    );
  }
}

/**
 * Get audit log for a specific market limit
 */
export async function getMarketLimitAuditLog(
  db: any,
  marketLimitId: number
): Promise<any[]> {
  const result = await db.prepare(`
    SELECT *
    FROM market_limits_log
    WHERE market_limit_id = ?
    ORDER BY created_at DESC
  `).bind(marketLimitId).all();

  return result.results || [];
}

/**
 * Get recent audit logs with optional filtering
 */
export async function getRecentAuditLogs(
  db: any,
  options: {
    limit?: number;
    fieldName?: string;
    changedBy?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<any[]> {
  let query = `
    SELECT
      mll.*,
      ml.commodity_code,
      ml.contract_name
    FROM market_limits_log mll
    LEFT JOIN market_limits ml ON mll.market_limit_id = ml.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options.fieldName) {
    query += ' AND mll.field_name = ?';
    params.push(options.fieldName);
  }

  if (options.changedBy) {
    query += ' AND mll.changed_by = ?';
    params.push(options.changedBy);
  }

  if (options.startDate) {
    query += ' AND mll.created_at >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ' AND mll.created_at <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY mll.created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  const result = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  return result.results || [];
}

/**
 * Compare two objects and log all differences
 */
export async function logObjectChanges(
  db: any,
  marketLimitId: number,
  oldObject: any,
  newObject: any,
  changedBy?: number
): Promise<void> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  // Find all changed fields
  for (const key in newObject) {
    if (oldObject[key] !== newObject[key]) {
      // Skip system fields
      if (['id', 'created_at', 'updated_at'].includes(key)) {
        continue;
      }

      changes.push({
        field: key,
        oldValue: oldObject[key],
        newValue: newObject[key],
      });
    }
  }

  if (changes.length > 0) {
    await logMarketLimitChanges(db, marketLimitId, changes, changedBy);
  }
}

/**
 * Create a comprehensive audit trail entry for important operations
 */
export async function logOperation(
  db: any,
  operation: {
    table: string;
    recordId: number;
    action: 'create' | 'update' | 'delete';
    description: string;
    userId?: number;
    metadata?: any;
  }
): Promise<void> {
  console.log(`[AUDIT] ${operation.action.toUpperCase()} ${operation.table}#${operation.recordId}: ${operation.description}`);

  // If this is a market_limits operation, use the market_limits_log table
  if (operation.table === 'market_limits') {
    await logMarketLimitChange(
      db,
      operation.recordId,
      'operation',
      null,
      operation.description,
      operation.userId
    );
  }
}

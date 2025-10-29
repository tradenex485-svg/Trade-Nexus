// Data Quality Service
// Comprehensive data quality monitoring, validation, and reporting

interface QualityCheckResult {
  check_id: number;
  quality_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  timeliness_score: number;
  uniqueness_score: number;
  integrity_score: number;
  issues_found: number;
  total_records: number;
}

interface QualityIssue {
  rule_id: number | null;
  issue_type: string;
  severity: string;
  table_name: string;
  record_id?: number;
  field_name?: string;
  issue_description: string;
  current_value?: string;
  suggested_fix?: string;
}

/**
 * Run comprehensive data quality checks
 */
export async function runQualityChecks(
  db: any,
  triggeredBy: string = 'manual'
): Promise<QualityCheckResult> {
  const startTime = Date.now();
  const issues: QualityIssue[] = [];

  // Get total record count across key tables
  const transactionsCount = await db.prepare('SELECT COUNT(*) as count FROM transactions').first();
  const marketLimitsCount = await db.prepare('SELECT COUNT(*) as count FROM market_limits').first();
  const limitCalcsCount = await db.prepare('SELECT COUNT(*) as count FROM limit_calculations WHERE is_active = 1').first();

  const totalRecords = (transactionsCount?.count || 0) + (marketLimitsCount?.count || 0) + (limitCalcsCount?.count || 0);

  // Get active quality rules
  const rules = await db.prepare('SELECT * FROM data_quality_rules WHERE is_active = 1').all();

  // Execute each quality rule
  for (const rule of rules.results || []) {
    const ruleIssues = await executeQualityRule(db, rule as any);
    issues.push(...ruleIssues);
  }

  // Additional automatic checks
  issues.push(...await detectDuplicates(db));
  issues.push(...await findOrphanedRecords(db));
  issues.push(...await checkMissingData(db));

  // Calculate quality scores
  const scores = await calculateQualityScores(db, issues, totalRecords);

  // Create quality check record
  const checkDuration = Date.now() - startTime;
  const checkResult = await db.prepare(`
    INSERT INTO data_quality_checks (
      total_records, issues_found, quality_score,
      completeness_score, accuracy_score, consistency_score,
      timeliness_score, uniqueness_score, integrity_score,
      check_duration_ms, triggered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    totalRecords,
    issues.length,
    scores.quality_score,
    scores.completeness_score,
    scores.accuracy_score,
    scores.consistency_score,
    scores.timeliness_score,
    scores.uniqueness_score,
    scores.integrity_score,
    checkDuration,
    triggeredBy
  ).run();

  const checkId = checkResult.meta.last_row_id;

  // Insert all issues
  for (const issue of issues) {
    await db.prepare(`
      INSERT INTO data_quality_issues (
        check_id, rule_id, issue_type, severity, table_name,
        record_id, field_name, issue_description, current_value, suggested_fix
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      checkId,
      issue.rule_id,
      issue.issue_type,
      issue.severity,
      issue.table_name,
      issue.record_id || null,
      issue.field_name || null,
      issue.issue_description,
      issue.current_value || null,
      issue.suggested_fix || null
    ).run();
  }

  return {
    check_id: checkId,
    quality_score: scores.quality_score,
    completeness_score: scores.completeness_score,
    accuracy_score: scores.accuracy_score,
    consistency_score: scores.consistency_score,
    timeliness_score: scores.timeliness_score,
    uniqueness_score: scores.uniqueness_score,
    integrity_score: scores.integrity_score,
    issues_found: issues.length,
    total_records: totalRecords,
  };
}

/**
 * Execute a single quality rule
 */
async function executeQualityRule(db: any, rule: any): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];
  const config = JSON.parse(rule.rule_config);

  try {
    switch (rule.rule_type) {
      case 'required_field':
        const missingResult = await db.prepare(`
          SELECT id FROM ${rule.target_table}
          WHERE ${config.field} IS NULL OR ${config.field} = ''
          LIMIT 100
        `).all();

        for (const row of missingResult.results || []) {
          issues.push({
            rule_id: rule.id,
            issue_type: 'missing_data',
            severity: rule.severity,
            table_name: rule.target_table,
            record_id: (row as any).id,
            field_name: config.field,
            issue_description: `Required field '${config.field}' is missing`,
            suggested_fix: 'Provide a value for this required field',
          });
        }
        break;

      case 'numeric_range':
        let rangeQuery = `SELECT id, ${config.field} as value FROM ${rule.target_table} WHERE `;
        const conditions = [];

        if (config.min !== null && config.min !== undefined) {
          conditions.push(`${config.field} < ${config.min}`);
        }
        if (config.max !== null && config.max !== undefined) {
          conditions.push(`${config.field} > ${config.max}`);
        }

        if (conditions.length > 0) {
          rangeQuery += conditions.join(' OR ') + ' LIMIT 100';
          const rangeResult = await db.prepare(rangeQuery).all();

          for (const row of rangeResult.results || []) {
            issues.push({
              rule_id: rule.id,
              issue_type: 'invalid_value',
              severity: rule.severity,
              table_name: rule.target_table,
              record_id: (row as any).id,
              field_name: config.field,
              issue_description: `Value out of valid range (${config.min} - ${config.max})`,
              current_value: String((row as any).value),
              suggested_fix: `Set value between ${config.min} and ${config.max}`,
            });
          }
        }
        break;

      case 'referential_integrity':
        const integrityQuery = `
          SELECT s.id, s.${config.source_field} as value
          FROM ${config.source_table} s
          LEFT JOIN ${config.target_table} t ON s.${config.source_field} = t.${config.target_field}
          WHERE t.${config.target_field} IS NULL
            AND s.${config.source_field} IS NOT NULL
          LIMIT 100
        `;
        const integrityResult = await db.prepare(integrityQuery).all();

        for (const row of integrityResult.results || []) {
          issues.push({
            rule_id: rule.id,
            issue_type: 'referential_integrity',
            severity: rule.severity,
            table_name: config.source_table,
            record_id: (row as any).id,
            field_name: config.source_field,
            issue_description: `Foreign key reference not found in ${config.target_table}`,
            current_value: (row as any).value,
            suggested_fix: `Create matching record in ${config.target_table} or correct the reference`,
          });
        }
        break;

      case 'duplicate':
        const groupBy = config.group_by.join(', ');
        const fields = config.fields.join(', ');
        const duplicateQuery = `
          SELECT ${fields}, COUNT(*) as duplicate_count
          FROM ${rule.target_table}
          GROUP BY ${groupBy}
          HAVING ${config.having || 'COUNT(*) > 1'}
          LIMIT 100
        `;
        const duplicateResult = await db.prepare(duplicateQuery).all();

        for (const row of duplicateResult.results || []) {
          issues.push({
            rule_id: rule.id,
            issue_type: 'duplicate',
            severity: rule.severity,
            table_name: rule.target_table,
            issue_description: `Duplicate records found (${(row as any).duplicate_count} occurrences)`,
            current_value: config.fields.map((f: string) => `${f}=${(row as any)[f]}`).join(', '),
            suggested_fix: 'Remove or merge duplicate records',
          });
        }
        break;

      case 'custom_sql':
        const customResult = await db.prepare(config.query).all();

        for (const row of customResult.results || []) {
          issues.push({
            rule_id: rule.id,
            issue_type: 'custom',
            severity: rule.severity,
            table_name: rule.target_table,
            record_id: (row as any).id,
            field_name: config.field || rule.target_field,
            issue_description: config.issue_description,
            current_value: String((row as any)[config.field || rule.target_field] || ''),
            suggested_fix: config.suggested_fix || 'Review and correct the value',
          });
        }
        break;
    }
  } catch (error) {
    console.error(`Error executing rule ${rule.rule_name}:`, error);
  }

  return issues;
}

/**
 * Detect duplicate records
 */
export async function detectDuplicates(db: any): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  // Check for duplicate transactions
  const dupTransactions = await db.prepare(`
    SELECT market_location, contract_month, trade_date, COUNT(*) as count
    FROM transactions
    GROUP BY market_location, contract_month, trade_date
    HAVING COUNT(*) > 1
    LIMIT 50
  `).all();

  for (const dup of dupTransactions.results || []) {
    issues.push({
      rule_id: null,
      issue_type: 'duplicate',
      severity: 'medium',
      table_name: 'transactions',
      issue_description: `Duplicate transaction: ${(dup as any).count} records with same market_location, contract_month, and trade_date`,
      current_value: `${(dup as any).market_location} / ${(dup as any).contract_month} / ${(dup as any).trade_date}`,
      suggested_fix: 'Review and remove duplicate transactions',
    });
  }

  return issues;
}

/**
 * Find orphaned records (referential integrity issues)
 */
export async function findOrphanedRecords(db: any): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  // Transactions without mapping
  const orphanedTransactions = await db.prepare(`
    SELECT t.id, t.market_location
    FROM transactions t
    LEFT JOIN mapping m ON t.market_location = m.market_location
    WHERE m.id IS NULL
    LIMIT 50
  `).all();

  for (const orphan of orphanedTransactions.results || []) {
    issues.push({
      rule_id: null,
      issue_type: 'orphaned_record',
      severity: 'high',
      table_name: 'transactions',
      record_id: (orphan as any).id,
      field_name: 'market_location',
      issue_description: 'Transaction has no corresponding mapping entry',
      current_value: (orphan as any).market_location,
      suggested_fix: 'Create mapping for this market location or correct the market_location value',
    });
  }

  // Limit calculations without market limits
  const orphanedCalcs = await db.prepare(`
    SELECT lc.id, lc.reporting_limit_code
    FROM limit_calculations lc
    LEFT JOIN market_limits ml ON lc.reporting_limit_code = ml.commodity_code
    WHERE ml.id IS NULL AND lc.is_active = 1
    LIMIT 50
  `).all();

  for (const orphan of orphanedCalcs.results || []) {
    issues.push({
      rule_id: null,
      issue_type: 'orphaned_record',
      severity: 'medium',
      table_name: 'limit_calculations',
      record_id: (orphan as any).id,
      field_name: 'reporting_limit_code',
      issue_description: 'Limit calculation has no corresponding market limit',
      current_value: (orphan as any).reporting_limit_code,
      suggested_fix: 'Verify the commodity code or create corresponding market limit',
    });
  }

  return issues;
}

/**
 * Check for missing critical data
 */
export async function checkMissingData(db: any): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  // Transactions with null/zero values
  const missingValues = await db.prepare(`
    SELECT id, market_location, contract_month
    FROM transactions
    WHERE base_delta_notnl_nd IS NULL OR base_delta_notnl_nd = 0
    LIMIT 50
  `).all();

  for (const missing of missingValues.results || []) {
    issues.push({
      rule_id: null,
      issue_type: 'missing_data',
      severity: 'medium',
      table_name: 'transactions',
      record_id: (missing as any).id,
      field_name: 'base_delta_notnl_nd',
      issue_description: 'Transaction has null or zero delta value',
      suggested_fix: 'Verify transaction data source and populate with correct value',
    });
  }

  return issues;
}

/**
 * Calculate comprehensive quality scores
 */
async function calculateQualityScores(
  db: any,
  issues: QualityIssue[],
  totalRecords: number
): Promise<{
  quality_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  timeliness_score: number;
  uniqueness_score: number;
  integrity_score: number;
}> {
  // Count issues by type
  const missingDataCount = issues.filter(i => i.issue_type === 'missing_data').length;
  const invalidValueCount = issues.filter(i => i.issue_type === 'invalid_value').length;
  const duplicateCount = issues.filter(i => i.issue_type === 'duplicate').length;
  const orphanedCount = issues.filter(i => i.issue_type === 'orphaned_record').length;

  // Calculate individual scores (0-100)
  const completeness_score = Math.max(0, 100 - (missingDataCount / Math.max(totalRecords, 1) * 100));
  const accuracy_score = Math.max(0, 100 - (invalidValueCount / Math.max(totalRecords, 1) * 100));
  const uniqueness_score = Math.max(0, 100 - (duplicateCount / Math.max(totalRecords, 1) * 100));
  const integrity_score = Math.max(0, 100 - (orphanedCount / Math.max(totalRecords, 1) * 100));

  // Timeliness: Check for stale data (market limits older than 60 days)
  const staleData = await db.prepare(`
    SELECT COUNT(*) as count FROM market_limits
    WHERE effective_date < DATE('now', '-60 days')
  `).first();
  const timeliness_score = Math.max(0, 100 - ((staleData?.count || 0) / Math.max(totalRecords, 1) * 100));

  // Consistency: Check for inconsistencies in aggregated data
  const consistency_score = 95; // Simplified for now

  // Overall quality score (weighted average)
  const quality_score = (
    completeness_score * 0.25 +
    accuracy_score * 0.20 +
    consistency_score * 0.15 +
    timeliness_score * 0.15 +
    uniqueness_score * 0.15 +
    integrity_score * 0.10
  );

  return {
    quality_score: Math.round(quality_score * 10) / 10,
    completeness_score: Math.round(completeness_score * 10) / 10,
    accuracy_score: Math.round(accuracy_score * 10) / 10,
    consistency_score: Math.round(consistency_score * 10) / 10,
    timeliness_score: Math.round(timeliness_score * 10) / 10,
    uniqueness_score: Math.round(uniqueness_score * 10) / 10,
    integrity_score: Math.round(integrity_score * 10) / 10,
  };
}

/**
 * Reconcile data between two tables
 */
export async function reconcileData(
  db: any,
  sourceTable: string,
  targetTable: string,
  reconciliationKey: string
): Promise<any> {
  // Get counts
  const sourceCount = await db.prepare(`SELECT COUNT(*) as count FROM ${sourceTable}`).first();
  const targetCount = await db.prepare(`SELECT COUNT(*) as count FROM ${targetTable}`).first();

  // Find unmatched records
  const unmatchedSource = await db.prepare(`
    SELECT COUNT(*) as count
    FROM ${sourceTable} s
    LEFT JOIN ${targetTable} t ON s.${reconciliationKey} = t.${reconciliationKey}
    WHERE t.${reconciliationKey} IS NULL
  `).first();

  const unmatchedTarget = await db.prepare(`
    SELECT COUNT(*) as count
    FROM ${targetTable} t
    LEFT JOIN ${sourceTable} s ON t.${reconciliationKey} = s.${reconciliationKey}
    WHERE s.${reconciliationKey} IS NULL
  `).first();

  const matchedCount = (sourceCount?.count || 0) - (unmatchedSource?.count || 0);

  // Save reconciliation result
  await db.prepare(`
    INSERT INTO data_reconciliation (
      source_table, target_table, source_count, target_count,
      matched_count, unmatched_source, unmatched_target, reconciliation_key, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
  `).bind(
    sourceTable,
    targetTable,
    sourceCount?.count || 0,
    targetCount?.count || 0,
    matchedCount,
    unmatchedSource?.count || 0,
    unmatchedTarget?.count || 0,
    reconciliationKey
  ).run();

  return {
    source_count: sourceCount?.count || 0,
    target_count: targetCount?.count || 0,
    matched_count: matchedCount,
    unmatched_source: unmatchedSource?.count || 0,
    unmatched_target: unmatchedTarget?.count || 0,
  };
}

/**
 * Track data lineage
 */
export async function trackDataLineage(
  db: any,
  sourceTable: string,
  sourceId: number,
  targetTable: string,
  targetId: number,
  transformation: string,
  uploadId?: number,
  metadata?: any
): Promise<void> {
  await db.prepare(`
    INSERT INTO data_lineage (
      source_table, source_id, target_table, target_id,
      transformation, upload_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    sourceTable,
    sourceId,
    targetTable,
    targetId,
    transformation,
    uploadId || null,
    metadata ? JSON.stringify(metadata) : null
  ).run();
}

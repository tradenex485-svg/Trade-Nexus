// Data Validation Service
// Validates data before insert/update operations

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate transaction data
 */
export function validateTransaction(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.market_location) {
    errors.push('market_location is required');
  }
  if (!data.contract_month) {
    errors.push('contract_month is required');
  }
  if (!data.trade_date) {
    errors.push('trade_date is required');
  }
  if (data.base_delta_notnl_nd === null || data.base_delta_notnl_nd === undefined) {
    errors.push('base_delta_notnl_nd is required');
  }

  // Numeric validations
  if (data.base_delta_notnl_nd !== undefined && isNaN(parseFloat(data.base_delta_notnl_nd))) {
    errors.push('base_delta_notnl_nd must be a valid number');
  }

  // Date validations
  if (data.contract_month && !isValidDate(data.contract_month)) {
    errors.push('contract_month must be a valid date');
  }
  if (data.trade_date && !isValidDate(data.trade_date)) {
    errors.push('trade_date must be a valid date');
  }

  // Future date warning
  if (data.trade_date && new Date(data.trade_date) > new Date()) {
    warnings.push('trade_date is in the future');
  }

  // Zero value warning
  if (data.base_delta_notnl_nd === 0) {
    warnings.push('base_delta_notnl_nd is zero');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate market limit data
 */
export function validateMarketLimit(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.contract_name) {
    errors.push('contract_name is required');
  }
  if (!data.commodity_code) {
    errors.push('commodity_code is required');
  }

  // Numeric validations
  if (data.spot_month_limit !== null && data.spot_month_limit !== undefined) {
    if (isNaN(parseFloat(data.spot_month_limit))) {
      errors.push('spot_month_limit must be a number');
    } else if (parseFloat(data.spot_month_limit) < 0) {
      errors.push('spot_month_limit cannot be negative');
    }
  }

  if (data.single_month_accountability_level !== null && data.single_month_accountability_level !== undefined) {
    if (isNaN(parseFloat(data.single_month_accountability_level))) {
      errors.push('single_month_accountability_level must be a number');
    } else if (parseFloat(data.single_month_accountability_level) < 0) {
      errors.push('single_month_accountability_level cannot be negative');
    }
  }

  if (data.all_month_accountability_level !== null && data.all_month_accountability_level !== undefined) {
    if (isNaN(parseFloat(data.all_month_accountability_level))) {
      errors.push('all_month_accountability_level must be a number');
    } else if (parseFloat(data.all_month_accountability_level) < 0) {
      errors.push('all_month_accountability_level cannot be negative');
    }
  }

  // Date validations
  if (data.effective_date && !isValidDate(data.effective_date)) {
    errors.push('effective_date must be a valid date');
  }

  // Logical consistency
  if (data.spot_month_limit === 0 && data.single_month_accountability_level === 0 && data.all_month_accountability_level === 0) {
    warnings.push('All limit values are zero');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate mapping data
 */
export function validateMapping(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.contract_name) {
    errors.push('contract_name is required');
  }
  if (!data.market_location) {
    errors.push('market_location is required');
  }
  if (!data.commodity_code) {
    errors.push('commodity_code is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate file upload schema
 */
export function validateFileSchema(
  headers: string[],
  expectedHeaders: string[],
  requiredHeaders: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  // Check for unexpected headers
  for (const header of headers) {
    if (!expectedHeaders.includes(header)) {
      warnings.push(`Unexpected column: ${header}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate date ranges
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  fieldName: string = 'date'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidDate(startDate)) {
    errors.push(`${fieldName} start_date is invalid`);
  }

  if (!isValidDate(endDate)) {
    errors.push(`${fieldName} end_date is invalid`);
  }

  if (isValidDate(startDate) && isValidDate(endDate)) {
    if (new Date(startDate) > new Date(endDate)) {
      errors.push(`${fieldName} start_date must be before end_date`);
    }

    // Warn if date range is too large
    const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      warnings.push(`${fieldName} range exceeds 1 year (${Math.round(daysDiff)} days)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
  value: any,
  min: number | null,
  max: number | null,
  fieldName: string = 'value'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (value === null || value === undefined) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors, warnings };
  }

  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors, warnings };
  }

  if (min !== null && numValue < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  if (max !== null && numValue > max) {
    errors.push(`${fieldName} must be at most ${max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate referential integrity
 */
export async function validateReferentialIntegrity(
  db: any,
  sourceTable: string,
  sourceField: string,
  sourceValue: any,
  targetTable: string,
  targetField: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!sourceValue) {
    return { valid: true, errors, warnings }; // Skip validation if value is null
  }

  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM ${targetTable}
    WHERE ${targetField} = ?
  `).bind(sourceValue).first();

  if (!result || result.count === 0) {
    errors.push(`Referenced ${targetField} '${sourceValue}' not found in ${targetTable}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check for duplicate records
 */
export async function checkDuplicate(
  db: any,
  table: string,
  fields: { [key: string]: any },
  excludeId?: number
): Promise<boolean> {
  const conditions = Object.keys(fields).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(fields);

  let query = `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`;

  if (excludeId) {
    query += ' AND id != ?';
    values.push(excludeId);
  }

  const result = await db.prepare(query).bind(...values).first();

  return (result?.count || 0) > 0;
}

// Helper functions

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function sanitizeInput(input: string): string {
  // Remove potential SQL injection characters
  return input.replace(/[';\\]/g, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateFileSize(size: number, maxSizeMB: number = 50): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sizeMB = size / (1024 * 1024);

  if (sizeMB > maxSizeMB) {
    errors.push(`File size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
  } else if (sizeMB > maxSizeMB * 0.8) {
    warnings.push(`File size (${sizeMB.toFixed(2)}MB) is close to the maximum limit`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateFileType(fileName: string, allowedExtensions: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (!allowedExtensions.includes(extension)) {
    errors.push(`File type '.${extension}' is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

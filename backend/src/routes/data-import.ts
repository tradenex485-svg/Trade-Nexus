import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import {
  calculateSpotMonthLimits,
  calculateSpotPlusMonthLimits,
  calculateOneMonthLimits,
  calculateAllMonthLimits,
  exportToTimeSeries,
} from '../services/limit-calculator';
import { generateAlertsForAllCalculations } from '../services/alert-service';
import { validateMarketLimit } from '../services/data-validation-service';
import { runQualityChecks } from '../services/data-quality-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const dataImportRoutes = new Hono<{ Bindings: Bindings }>();

// Helper function to extract date from Excel string
function extractDate(dateStr: string): string | null {
  // Try format: "January 15, 2024" or "January 2024"
  const monthYearMatch = dateStr.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)(?: \d{1,2},)? \d{4}\b/i);
  if (monthYearMatch) {
    const dateFound = monthYearMatch[0];
    return new Date(dateFound).toISOString().split('T')[0];
  }

  // Try format: "12/15/2024" or "1/5/2024"
  const slashDateMatch = dateStr.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  if (slashDateMatch) {
    const dateFound = slashDateMatch[0];
    return new Date(dateFound).toISOString().split('T')[0];
  }

  return null;
}

// Helper to parse Excel row into market limit object
function parseExcelRow(row: any[], effectiveDate: string): any {
  // Map based on ICE Excel structure to match database schema
  return {
    effective_date: effectiveDate,
    commodity_code: row[0]?.toString().trim() || null,
    contract_name: row[1]?.toString().trim() || null,
    unit_of_trading: row[2]?.toString().trim() || null,
    spot_month_limit: parseFloat(row[3]) || 0,
    single_month_accountability_level: parseFloat(row[4]) || 0,
    all_month_accountability_level: parseFloat(row[5]) || 0,
    aggregate_1_positive_correlation: row[6]?.toString().trim() || null,
    aggregate_2_negative_correlation: row[7]?.toString().trim() || null,
    exchange_reportable_level: parseFloat(row[8]) || 0,
    is_parent: 0,
    is_active: 1,
  };
}

// Manual trigger to import ICE data
dataImportRoutes.post('/import/ice', async (c) => {
  const startTime = Date.now();
  let uploadId: number | null = null;

  try {
    console.log('Starting ICE data import...');

    const url = 'https://www.ice.com/publicdocs/otc/advisory_notices/IFUS_Energy_Position_Limit_Accountability_and_Reportable_Levels.xlsx';

    // Download Excel file
    console.log('Downloading Excel file from ICE...');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

    // Create file upload record
    const uploadResult = await c.env.DB.prepare(`
      INSERT INTO file_uploads (
        file_name, file_type, file_size, target_table,
        upload_status, total_rows
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'ICE_Market_Limits.xlsx',
      'xlsx',
      arrayBuffer.byteLength,
      'market_limits',
      'processing',
      0
    ).run();

    uploadId = Number(uploadResult.meta.last_row_id);

    // Parse Excel
    console.log('Parsing Excel file...');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Parsed ${data.length} rows from Excel`);
    console.log('First 5 rows:', JSON.stringify(data.slice(0, 5), null, 2));

    // Extract effective date from row 2 (index 1)
    const dateStr = data[1]?.[0]?.toString() || '';
    const effectiveDate = extractDate(dateStr);

    if (!effectiveDate) {
      return c.json({
        success: false,
        message: 'Could not extract effective date from Excel file',
        dateString: dateStr,
      }, 400);
    }

    console.log(`Effective date: ${effectiveDate}`);

    // Check if we already have this date
    const existing = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM market_limits WHERE effective_date = ?'
    ).bind(effectiveDate).first();

    if (existing && existing.count > 0) {
      console.log('Data already up to date');
      return c.json({
        success: true,
        message: 'Data already up to date',
        effectiveDate,
        alreadyImported: true,
      });
    }

    // Parse data rows (starting from row 5, index 4)
    const dataRows = data.slice(4);
    const validRows: any[] = [];
    const validationErrors: string[] = [];
    let skippedCount = 0;

    console.log(`Processing ${dataRows.length} potential data rows...`);

    for (const row of dataRows) {
      // Skip empty rows
      if (!row[0]) continue;

      const parsed = parseExcelRow(row, effectiveDate);

      // Log first few rows to debug structure
      if (validRows.length < 3) {
        console.log(`Sample row ${validRows.length}:`, {
          commodity_code: parsed.commodity_code,
          contract_name: parsed.contract_name,
          spot_month_limit: parsed.spot_month_limit,
          single_month: parsed.single_month_accountability_level,
          all_month: parsed.all_month_accountability_level,
        });
      }

      // Validate using data-validation-service
      const validation = validateMarketLimit(parsed);

      if (!validation.valid) {
        skippedCount++;
        validationErrors.push(`Row ${validRows.length + skippedCount + 1}: ${validation.errors.join(', ')}`);
        continue;
      }

      // More lenient validation - accept if commodity code exists and at least one limit is present
      if (parsed.commodity_code &&
          (parsed.spot_month_limit > 0 ||
           parsed.single_month_accountability_level > 0 ||
           parsed.all_month_accountability_level > 0)) {
        validRows.push(parsed);
      } else {
        skippedCount++;
      }
    }

    console.log(`Parsed ${validRows.length} valid rows out of ${dataRows.length} total rows (${skippedCount} skipped)`);

    if (validRows.length === 0) {
      await c.env.DB.prepare(`
        UPDATE file_uploads
        SET upload_status = 'failed',
            validation_errors = ?,
            processing_time_ms = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        JSON.stringify(['No valid data rows found in Excel file']),
        Date.now() - startTime,
        uploadId
      ).run();

      return c.json({
        success: false,
        message: 'No valid data rows found in Excel file',
      }, 400);
    }

    // Clear existing market limits
    console.log('Clearing existing market limits...');
    await c.env.DB.prepare('DELETE FROM market_limits').run();

    // Batch insert new data
    console.log('Inserting new market limits...');
    const stmt = c.env.DB.prepare(`
      INSERT INTO market_limits
      (effective_date, commodity_code, contract_name, unit_of_trading,
       spot_month_limit, single_month_accountability_level, all_month_accountability_level,
       aggregate_1_positive_correlation, aggregate_2_negative_correlation,
       exchange_reportable_level, is_parent, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = validRows.map(row =>
      stmt.bind(
        row.effective_date,
        row.commodity_code,
        row.contract_name,
        row.unit_of_trading,
        row.spot_month_limit,
        row.single_month_accountability_level,
        row.all_month_accountability_level,
        row.aggregate_1_positive_correlation,
        row.aggregate_2_negative_correlation,
        row.exchange_reportable_level,
        row.is_parent,
        row.is_active
      )
    );

    await c.env.DB.batch(batch);
    console.log('Market limits imported successfully');

    // Trigger calculations
    console.log('Triggering limit calculations...');
    const spotCount = await calculateSpotMonthLimits(c.env.DB);
    const spotPlusCount = await calculateSpotPlusMonthLimits(c.env.DB);
    const oneMonthCount = await calculateOneMonthLimits(c.env.DB);
    const allMonthCount = await calculateAllMonthLimits(c.env.DB);

    // Export to time series for historical tracking
    console.log('Exporting to time series...');
    const exportedCount = await exportToTimeSeries(c.env.DB);

    // Generate alerts for new calculations
    console.log('Generating alerts...');
    const alertsGenerated = await generateAlertsForAllCalculations(c.env.DB);

    console.log('Import complete!');

    // Update file upload record
    const uploadStatus = validRows.length === 0 ? 'failed' : (skippedCount > 0 ? 'partial' : 'completed');
    await c.env.DB.prepare(`
      UPDATE file_uploads
      SET upload_status = ?,
          total_rows = ?,
          valid_rows = ?,
          invalid_rows = ?,
          validation_errors = ?,
          processing_time_ms = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      uploadStatus,
      dataRows.length,
      validRows.length,
      skippedCount,
      validationErrors.length > 0 ? JSON.stringify(validationErrors.slice(0, 100)) : null,
      Date.now() - startTime,
      uploadId
    ).run();

    // Run quality checks
    console.log('Running quality checks...');
    try {
      await runQualityChecks(c.env.DB, 'import');
    } catch (error: any) {
      console.error('Quality check error:', error);
    }

    return c.json({
      success: true,
      message: `Successfully imported ${validRows.length} market limits`,
      effectiveDate,
      rowsImported: validRows.length,
      rowsSkipped: skippedCount,
      upload_id: uploadId,
      calculations: {
        spotMonth: spotCount,
        spotPlusMonth: spotPlusCount,
        oneMonth: oneMonthCount,
        allMonth: allMonthCount,
      },
      exported: exportedCount,
      alertsGenerated,
      validation_errors: validationErrors.length > 0 ? validationErrors.slice(0, 10) : [],
    });

  } catch (error: any) {
    console.error('Import error:', error);

    // Update file upload record on error
    if (uploadId) {
      try {
        await c.env.DB.prepare(`
          UPDATE file_uploads
          SET upload_status = 'failed',
              validation_errors = ?,
              processing_time_ms = ?,
              completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          JSON.stringify([error.message]),
          Date.now() - startTime,
          uploadId
        ).run();
      } catch (updateError: any) {
        console.error('Error updating file upload record:', updateError);
      }
    }

    return c.json({
      success: false,
      message: 'Import failed',
      error: error.message,
    }, 500);
  }
});

// Endpoint to manually trigger calculations
dataImportRoutes.post('/calculate/all', async (c) => {
  try {
    console.log('Running all calculations...');

    const spotCount = await calculateSpotMonthLimits(c.env.DB);
    const spotPlusCount = await calculateSpotPlusMonthLimits(c.env.DB);
    const oneMonthCount = await calculateOneMonthLimits(c.env.DB);
    const allMonthCount = await calculateAllMonthLimits(c.env.DB);

    // Export to time series for historical tracking
    console.log('Exporting to time series...');
    const exportedCount = await exportToTimeSeries(c.env.DB);

    // Generate alerts for new calculations
    console.log('Generating alerts...');
    const alertsGenerated = await generateAlertsForAllCalculations(c.env.DB);

    return c.json({
      success: true,
      message: 'Calculations completed',
      calculations: {
        spotMonth: spotCount,
        spotPlusMonth: spotPlusCount,
        oneMonth: oneMonthCount,
        allMonth: allMonthCount,
      },
      exported: exportedCount,
      alertsGenerated,
    });
  } catch (error: any) {
    console.error('Calculation error:', error);
    return c.json({
      success: false,
      message: 'Calculations failed',
      error: error.message,
    }, 500);
  }
});

// Get import status/history
dataImportRoutes.get('/import/status', async (c) => {
  try {
    const marketLimitsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count, MAX(effective_date) as latest_date FROM market_limits'
    ).first();

    const calculationsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count, MAX(as_of_date) as latest_date FROM limit_calculations'
    ).first();

    return c.json({
      success: true,
      marketLimits: {
        count: marketLimitsCount?.count || 0,
        latestEffectiveDate: marketLimitsCount?.latest_date || null,
      },
      calculations: {
        count: calculationsCount?.count || 0,
        latestAsOfDate: calculationsCount?.latest_date || null,
      },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

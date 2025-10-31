import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import {
  validateTransaction,
  validateFileSize,
  validateFileType,
  validateFileSchema,
} from '../services/data-validation-service';
import { runQualityChecks } from '../services/data-quality-service';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

export const csvImportRoutes = new Hono<{ Bindings: Bindings }>();

// Apply authentication to all CSV import routes
csvImportRoutes.use('*', requireAuth);

// Helper function to parse CSV
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
}

// Import transactions from CSV
csvImportRoutes.post('/transactions', async (c) => {
  const startTime = Date.now();
  let uploadId: number | null = null;

  try {
    console.log('Starting transaction CSV import...');

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({
        success: false,
        message: 'No file uploaded or invalid file',
      }, 400);
    }

    // Validate file type
    const fileTypeValidation = validateFileType(file.name, ['csv']);
    if (!fileTypeValidation.valid) {
      return c.json({
        success: false,
        message: fileTypeValidation.errors.join(', '),
      }, 400);
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(file.size, 50);
    if (!fileSizeValidation.valid) {
      return c.json({
        success: false,
        message: fileSizeValidation.errors.join(', '),
      }, 400);
    }

    // Get user from context
    const user = c.get('user') as any;

    // Create file upload record
    const uploadResult = await c.env.DB.prepare(`
      INSERT INTO file_uploads (
        file_name, file_type, file_size, target_table,
        upload_status, total_rows, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      file.name,
      'csv',
      file.size,
      'transactions',
      'processing',
      0,
      user?.id || null
    ).run();

    uploadId = Number(uploadResult.meta.last_row_id);

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      await c.env.DB.prepare(`
        UPDATE file_uploads
        SET upload_status = 'failed',
            validation_errors = ?,
            processing_time_ms = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        JSON.stringify(['No valid data rows found in CSV file']),
        Date.now() - startTime,
        uploadId
      ).run();

      return c.json({
        success: false,
        message: 'No valid data rows found in CSV file',
      }, 400);
    }

    // Validate CSV schema
    const expectedHeaders = ['market_location', 'contract_month', 'base_delta_notnl_nd', 'index_uom', 'trade_date', 'status', 'frequency', 'exchange'];
    const requiredHeaders = ['market_location', 'contract_month', 'base_delta_notnl_nd', 'trade_date'];
    const actualHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];

    const schemaValidation = validateFileSchema(actualHeaders, expectedHeaders, requiredHeaders);
    if (!schemaValidation.valid) {
      await c.env.DB.prepare(`
        UPDATE file_uploads
        SET upload_status = 'failed',
            validation_errors = ?,
            processing_time_ms = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        JSON.stringify(schemaValidation.errors),
        Date.now() - startTime,
        uploadId
      ).run();

      return c.json({
        success: false,
        message: 'Invalid CSV schema',
        errors: schemaValidation.errors,
      }, 400);
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const validationErrors: string[] = [];

    for (const row of rows) {
      try {
        // Validate transaction data
        const validation = validateTransaction(row);

        if (!validation.valid) {
          skippedCount++;
          validationErrors.push(`Row ${insertedCount + skippedCount + 1}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Insert into transactions table
        await c.env.DB.prepare(`
          INSERT INTO transactions (
            market_location, contract_month, base_delta_notnl_nd, index_uom,
            trade_date, status, frequency, exchange
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          row.market_location,
          row.contract_month,
          parseFloat(row.base_delta_notnl_nd) || 0,
          row.index_uom || null,
          row.trade_date,
          parseInt(row.status) || 0,
          parseInt(row.frequency) || 0,
          row.exchange || null
        ).run();

        insertedCount++;
      } catch (error: any) {
        console.error(`Error inserting row:`, error);
        skippedCount++;
        validationErrors.push(`Row ${insertedCount + skippedCount + 1}: ${error.message}`);
      }
    }

    // Aggregate into temp_transactions
    console.log('Aggregating into temp_transactions...');

    await c.env.DB.prepare('DELETE FROM temp_transactions').run();

    await c.env.DB.prepare(`
      INSERT INTO temp_transactions (
        market_location, contract_month, base_delta_notnl_nd,
        total_buy, total_sale, index_uom, frequency, exchange
      )
      SELECT
        market_location,
        contract_month,
        SUM(base_delta_notnl_nd) as base_delta_notnl_nd,
        SUM(CASE WHEN base_delta_notnl_nd > 0 THEN base_delta_notnl_nd ELSE 0 END) as total_buy,
        SUM(CASE WHEN base_delta_notnl_nd < 0 THEN ABS(base_delta_notnl_nd) ELSE 0 END) as total_sale,
        MAX(index_uom) as index_uom,
        MAX(frequency) as frequency,
        MAX(exchange) as exchange
      FROM transactions
      WHERE status = 1
        AND (transaction_type IS NULL OR transaction_type NOT IN ('COMM-PHYS', 'COMM-STOR', 'CASH'))
        AND (is_internal IS NULL OR is_internal = 0)
      GROUP BY market_location, contract_month
    `).run();

    console.log('Transaction import and aggregation complete');

    // Update file upload record
    const uploadStatus = insertedCount === 0 ? 'failed' : (skippedCount > 0 ? 'partial' : 'completed');
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
      rows.length,
      insertedCount,
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
      message: `Successfully imported ${insertedCount} transactions`,
      inserted: insertedCount,
      skipped: skippedCount,
      upload_id: uploadId,
      validation_errors: validationErrors.length > 0 ? validationErrors.slice(0, 10) : [],
    });

  } catch (error: any) {
    console.error('Transaction import error:', error);

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

// Import power data from CSV
csvImportRoutes.post('/power-data', async (c) => {
  const startTime = Date.now();
  let uploadId: number | null = null;

  try {
    console.log('Starting power data CSV import...');

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({
        success: false,
        message: 'No file uploaded or invalid file',
      }, 400);
    }

    // Validate file type
    const fileTypeValidation = validateFileType(file.name, ['csv']);
    if (!fileTypeValidation.valid) {
      return c.json({
        success: false,
        message: fileTypeValidation.errors.join(', '),
      }, 400);
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(file.size, 50);
    if (!fileSizeValidation.valid) {
      return c.json({
        success: false,
        message: fileSizeValidation.errors.join(', '),
      }, 400);
    }

    // Get user from context
    const user = c.get('user') as any;

    // Create file upload record
    const uploadResult = await c.env.DB.prepare(`
      INSERT INTO file_uploads (
        file_name, file_type, file_size, target_table,
        upload_status, total_rows, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      file.name,
      'csv',
      file.size,
      'power_data',
      'processing',
      0,
      user?.id || null
    ).run();

    uploadId = Number(uploadResult.meta.last_row_id);

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      await c.env.DB.prepare(`
        UPDATE file_uploads
        SET upload_status = 'failed',
            validation_errors = ?,
            processing_time_ms = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        JSON.stringify(['No valid data rows found in CSV file']),
        Date.now() - startTime,
        uploadId
      ).run();

      return c.json({
        success: false,
        message: 'No valid data rows found in CSV file',
      }, 400);
    }

    // Validate CSV schema
    const expectedHeaders = ['exchange_product_code', 'contract_month', 'net_position', 'base_delta_notnl_nd', 'base_delta_notnl', 'product_description', 'commodity', 'index_uom', 'trading_date', 'status', 'trans_type'];
    const requiredHeaders = ['exchange_product_code', 'contract_month'];
    const actualHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];

    const schemaValidation = validateFileSchema(actualHeaders, expectedHeaders, requiredHeaders);
    if (!schemaValidation.valid) {
      await c.env.DB.prepare(`
        UPDATE file_uploads
        SET upload_status = 'failed',
            validation_errors = ?,
            processing_time_ms = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        JSON.stringify(schemaValidation.errors),
        Date.now() - startTime,
        uploadId
      ).run();

      return c.json({
        success: false,
        message: 'Invalid CSV schema',
        errors: schemaValidation.errors,
      }, 400);
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const validationErrors: string[] = [];

    for (const row of rows) {
      try {
        // Validate required fields
        if (!row.exchange_product_code || !row.contract_month) {
          skippedCount++;
          validationErrors.push(`Row ${insertedCount + skippedCount + 1}: Missing required fields`);
          continue;
        }

        // Insert into power_data table
        await c.env.DB.prepare(`
          INSERT INTO power_data (
            exchange_product_code, contract_month, net_position, base_delta_notnl_nd,
            base_delta_notnl, product_description, commodity, index_uom,
            trading_date, status, trans_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          row.exchange_product_code,
          row.contract_month,
          parseFloat(row.net_position) || 0,
          parseFloat(row.base_delta_notnl_nd) || 0,
          parseFloat(row.base_delta_notnl) || 0,
          row.product_description || null,
          row.commodity || null,
          row.index_uom || null,
          row.trading_date || null,
          parseInt(row.status) || 0,
          parseInt(row.trans_type) || 1
        ).run();

        insertedCount++;
      } catch (error: any) {
        console.error(`Error inserting row:`, error);
        skippedCount++;
        validationErrors.push(`Row ${insertedCount + skippedCount + 1}: ${error.message}`);
      }
    }

    console.log('Power data import complete');

    // Update file upload record
    const uploadStatus = insertedCount === 0 ? 'failed' : (skippedCount > 0 ? 'partial' : 'completed');
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
      rows.length,
      insertedCount,
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
      message: `Successfully imported ${insertedCount} power data records`,
      inserted: insertedCount,
      skipped: skippedCount,
      upload_id: uploadId,
      validation_errors: validationErrors.length > 0 ? validationErrors.slice(0, 10) : [],
    });

  } catch (error: any) {
    console.error('Power data import error:', error);

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

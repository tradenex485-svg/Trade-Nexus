/**
 * Financial Management Routes
 * Bank accounts, transactions, fee tracking
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

const app = new Hono();

// Get bank accounts
app.get('/accounts', authenticate, authorize('financial.read'), async (c) => {
  try {
    const user = c.get('user');
    let query = `SELECT * FROM bank_accounts WHERE is_active = 1`;
    const params: any[] = [];

    // Company users see only their accounts
    if (user.company_id && user.role_name !== 'super_admin') {
      query += ` AND company_id = ?`;
      params.push(user.company_id);
    }

    query += ` ORDER BY is_primary DESC, created_at DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create bank account
app.post('/accounts', authenticate, authorize('financial.create'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const result = await c.env.DB.prepare(`
      INSERT INTO bank_accounts (
        account_holder_type, company_id, account_name, account_number,
        bank_name, bank_branch, swift_code, routing_number, iban,
        account_type, currency, is_primary, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      user.company_id ? 'company' : 'regulator',
      user.company_id || null,
      body.account_name,
      body.account_number,
      body.bank_name,
      body.bank_branch || null,
      body.swift_code || null,
      body.routing_number || null,
      body.iban || null,
      body.account_type || 'checking',
      body.currency || 'USD',
      body.is_primary || 0
    ).run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get transactions
app.get('/transactions', authenticate, authorize('financial.read'), async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');

    let query = `
      SELECT ft.*,
        ba_from.account_name as from_account_name,
        ba_to.account_name as to_account_name,
        c.company_name
      FROM financial_transactions ft
      LEFT JOIN bank_accounts ba_from ON ft.from_account_id = ba_from.id
      LEFT JOIN bank_accounts ba_to ON ft.to_account_id = ba_to.id
      LEFT JOIN companies c ON ft.company_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Company users see only their transactions
    if (user.company_id && user.role_name !== 'super_admin') {
      query += ` AND ft.company_id = ?`;
      params.push(user.company_id);
    }

    if (status) {
      query += ` AND ft.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ft.created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create transaction
app.post('/transactions', authenticate, authorize('financial.create'), async (c) => {
  try {
    const body = await c.req.json();

    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await c.env.DB.prepare(`
      INSERT INTO financial_transactions (
        transaction_number, transaction_type, amount, currency,
        from_account_id, to_account_id, company_id, subscription_id,
        status, payment_method, reference_number, transaction_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionNumber,
      body.transaction_type,
      body.amount,
      body.currency || 'USD',
      body.from_account_id || null,
      body.to_account_id || null,
      body.company_id || null,
      body.subscription_id || null,
      'pending',
      body.payment_method || null,
      body.reference_number || null,
      body.transaction_date || new Date().toISOString().split('T')[0],
      body.description || null
    ).run();

    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, transaction_number: transactionNumber },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Complete transaction
app.post('/transactions/:id/complete', authenticate, authorize('financial.manage'), async (c) => {
  try {
    const transactionId = parseInt(c.req.param('id'));

    await c.env.DB.prepare(`
      UPDATE financial_transactions
      SET status = 'completed',
          completed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(transactionId).run();

    return c.json({ success: true, message: 'Transaction completed' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

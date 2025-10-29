/**
 * Approval Workflows Routes
 * Company signup, trader verification, limit overrides
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

const app = new Hono();

// Get all approval requests
app.get('/', authenticate, authorize('approvals.read'), async (c) => {
  try {
    const status = c.req.query('status') || 'pending';
    const requestType = c.req.query('request_type');

    let query = `SELECT * FROM v_pending_approvals WHERE 1=1`;
    const params: any[] = [];

    if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (requestType) {
      query += ` AND request_type = ?`;
      params.push(requestType);
    }

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create approval request
app.post('/', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const result = await c.env.DB.prepare(`
      INSERT INTO approval_requests (
        request_type, title, description, company_id, user_id,
        subscription_id, limit_calculation_id, request_data,
        status, priority, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      body.request_type,
      body.title,
      body.description || null,
      body.company_id || null,
      body.user_id || null,
      body.subscription_id || null,
      body.limit_calculation_id || null,
      body.request_data ? JSON.stringify(body.request_data) : null,
      body.priority || 'normal',
      user.id
    ).run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Approve request
app.post('/:id/approve', authenticate, authorize('approvals.approve'), async (c) => {
  try {
    const user = c.get('user');
    const requestId = parseInt(c.req.param('id'));
    const { approval_notes } = await c.req.json().catch(() => ({}));

    await c.env.DB.prepare(`
      UPDATE approval_requests
      SET status = 'approved',
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          approval_notes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, approval_notes || null, requestId).run();

    return c.json({ success: true, message: 'Request approved' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Reject request
app.post('/:id/reject', authenticate, authorize('approvals.approve'), async (c) => {
  try {
    const user = c.get('user');
    const requestId = parseInt(c.req.param('id'));
    const { rejection_reason } = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE approval_requests
      SET status = 'rejected',
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, rejection_reason, requestId).run();

    return c.json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get approval history
app.get('/:id/history', authenticate, authorize('approvals.read'), async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));

    const result = await c.env.DB.prepare(`
      SELECT
        ah.*,
        u.name as performed_by_name,
        u.email as performed_by_email
      FROM approval_history ah
      JOIN users u ON ah.performed_by = u.id
      WHERE ah.approval_request_id = ?
      ORDER BY ah.created_at ASC
    `).bind(requestId).all();

    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

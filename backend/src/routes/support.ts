/**
 * Support & Communication Routes
 * Handles tickets, newsletters, broadcasts
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

const app = new Hono();

// ============================================================================
// SUPPORT TICKETS
// ============================================================================

// Get all tickets
app.get('/tickets', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');

    let query = `SELECT * FROM support_tickets WHERE 1=1`;
    const params: any[] = [];

    // Company users see only their tickets
    if (user.company_id && user.role_name !== 'super_admin') {
      query += ` AND (company_id = ? OR created_by = ?)`;
      params.push(user.company_id ?? null, user.id ?? null);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    console.error('[Support Tickets API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create ticket
app.post('/tickets', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const { subject, description, category, priority } = await c.req.json();

    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await c.env.DB.prepare(`
      INSERT INTO support_tickets (
        ticket_number, subject, description, category, priority,
        created_by, company_id, status, last_response_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
    `).bind(
      ticketNumber,
      subject,
      description,
      category || 'general',
      priority || 'medium',
      user.id ?? null,
      user.company_id ?? null
    ).run();

    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, ticket_number: ticketNumber },
    });
  } catch (error: any) {
    console.error('[Create Ticket API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get ticket messages
app.get('/tickets/:id/messages', authenticate, async (c) => {
  try {
    const ticketId = parseInt(c.req.param('id'));

    const result = await c.env.DB.prepare(`
      SELECT
        tm.*,
        u.name as sender_name,
        u.email as sender_email
      FROM ticket_messages tm
      JOIN users u ON tm.sender_id = u.id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `).bind(ticketId).all();

    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add message to ticket
app.post('/tickets/:id/messages', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const ticketId = parseInt(c.req.param('id'));
    const { message, is_internal } = await c.req.json();

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (ticket_id, message, sender_id, is_internal)
      VALUES (?, ?, ?, ?)
    `).bind(ticketId, message, user.id ?? null, is_internal || 0).run();

    // Update ticket last_response_at
    await c.env.DB.prepare(`
      UPDATE support_tickets
      SET last_response_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(ticketId).run();

    return c.json({ success: true, message: 'Message added' });
  } catch (error: any) {
    console.error('[Add Message API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update ticket status
app.patch('/tickets/:id/status', authenticate, authorize('support.manage'), async (c) => {
  try {
    const user = c.get('user');
    const ticketId = parseInt(c.req.param('id'));
    const { status, resolution_notes } = await c.req.json();

    const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
    const params = [status];

    if (status === 'resolved' || status === 'closed') {
      updates.push('resolved_at = datetime(\'now\')', 'resolved_by = ?');
      params.push(user.id ?? null);

      if (resolution_notes) {
        updates.push('resolution_notes = ?');
        params.push(resolution_notes);
      }
    }

    params.push(ticketId);

    await c.env.DB.prepare(`
      UPDATE support_tickets
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    return c.json({ success: true, message: 'Ticket status updated' });
  } catch (error: any) {
    console.error('[Update Ticket Status API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// NEWSLETTERS
// ============================================================================

// Get newsletters
app.get('/newsletters', authenticate, async (c) => {
  try {
    const user = c.get('user');
    // Ensure limit is always a valid number, never NaN or undefined
    const limit = Math.min(parseInt(c.req.query('limit') || '20') || 20, 100);

    let query = `
      SELECT n.*,
        (SELECT COUNT(*) FROM newsletter_reads WHERE newsletter_id = n.id AND user_id = ?) as is_read
      FROM newsletters n
      WHERE n.status = 'published'
    `;

    // Ensure user.id is never undefined - convert to null for D1
    const params: any[] = [user.id ?? null];

    // Filter by company
    if (user.company_id) {
      query += ` AND (n.recipient_type = 'all_companies' OR n.target_companies LIKE ?)`;
      params.push(`%${user.company_id}%`);
    }

    query += ` ORDER BY n.published_at DESC LIMIT ?`;
    // Ensure limit is never undefined
    params.push(limit ?? 20);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ success: true, data: result.results });
  } catch (error: any) {
    console.error('[Newsletters API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create newsletter
app.post('/newsletters', authenticate, authorize('newsletters.create'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const result = await c.env.DB.prepare(`
      INSERT INTO newsletters (
        title, content, category, recipient_type,
        target_companies, target_exchanges, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.title,
      body.content,
      body.category || null,
      body.recipient_type,
      body.target_companies ? JSON.stringify(body.target_companies) : null,
      body.target_exchanges ? JSON.stringify(body.target_exchanges) : null,
      body.status || 'draft',
      user.id ?? null
    ).run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } });
  } catch (error: any) {
    console.error('[Create Newsletter API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Publish newsletter
app.post('/newsletters/:id/publish', authenticate, authorize('newsletters.publish'), async (c) => {
  try {
    const user = c.get('user');
    const newsletterId = parseInt(c.req.param('id'));

    await c.env.DB.prepare(`
      UPDATE newsletters
      SET status = 'published',
          published_by = ?,
          published_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id ?? null, newsletterId).run();

    return c.json({ success: true, message: 'Newsletter published' });
  } catch (error: any) {
    console.error('[Publish Newsletter API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Mark newsletter as read
app.post('/newsletters/:id/read', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const newsletterId = parseInt(c.req.param('id'));

    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO newsletter_reads (newsletter_id, user_id, company_id)
      VALUES (?, ?, ?)
    `).bind(newsletterId, user.id ?? null, user.company_id ?? null).run();

    return c.json({ success: true, message: 'Newsletter marked as read' });
  } catch (error: any) {
    console.error('[Newsletter Read API Error]:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

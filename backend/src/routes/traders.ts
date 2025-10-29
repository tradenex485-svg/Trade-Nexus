/**
 * Traders Management Routes
 * Super Admin: manage all traders across all companies
 * Company Admin: manage traders in their company only
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

const tradersRoutes = new Hono<{ Bindings: Bindings }>();

async function getRoleId(db: any, roleName: string): Promise<number> {
  const role = await db.prepare('SELECT id FROM roles WHERE role_name = ?')
    .bind(roleName).first<{ id: number }>();
  return role?.id || 0;
}

// Get all traders
tradersRoutes.get('/', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const superAdminId = await getRoleId(c.env.DB, 'super_admin');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');
    const traderId = await getRoleId(c.env.DB, 'trader');

    let query = `
      SELECT
        u.id, u.name, u.email, u.trader_code, u.department,
        u.company_id, u.is_active, u.created_at,
        r.role_name,
        c.company_name, c.company_code,
        ta.desk_name, ta.is_primary
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN trader_assignments ta ON u.id = ta.user_id
      WHERE u.role_id = ?
    `;

    let params: any[] = [traderId];

    // Company Admin sees only their company's traders
    if (user.roleId === companyAdminId) {
      const userCompany = await c.env.DB.prepare(`
        SELECT company_id FROM users WHERE id = ?
      `).bind(user.userId).first<{ company_id: number }>();

      if (!userCompany?.company_id) {
        return c.json({
          success: false,
          error: 'User not assigned to a company',
        }, 400);
      }

      query += ' AND u.company_id = ?';
      params.push(userCompany.company_id);
    }

    query += ' ORDER BY c.company_name, u.name';

    const result = await c.env.DB.prepare(query)
      .bind(...params)
      .all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching traders:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get trader by ID
tradersRoutes.get('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');

    let query = `
      SELECT
        u.id, u.name, u.email, u.trader_code, u.department,
        u.company_id, u.is_active, u.created_at, u.updated_at,
        r.role_name,
        c.company_name, c.company_code, c.exchange_id,
        e.exchange_name, e.exchange_code
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN exchanges e ON c.exchange_id = e.id
      WHERE u.id = ?
    `;

    const trader = await c.env.DB.prepare(query).bind(id).first();

    if (!trader) {
      return c.json({ success: false, error: 'Trader not found' }, 404);
    }

    // Company Admin can only view their company's traders
    if (user.roleId === companyAdminId) {
      const userCompany = await c.env.DB.prepare(`
        SELECT company_id FROM users WHERE id = ?
      `).bind(user.userId).first<{ company_id: number }>();

      if (trader.company_id !== userCompany?.company_id) {
        return c.json({ success: false, error: 'Access denied' }, 403);
      }
    }

    // Get trader assignments
    const assignments = await c.env.DB.prepare(`
      SELECT
        ta.id, ta.trader_code, ta.desk_name, ta.is_primary, ta.assigned_at,
        c.company_name, c.company_code
      FROM trader_assignments ta
      LEFT JOIN companies c ON ta.company_id = c.id
      WHERE ta.user_id = ?
      ORDER BY ta.is_primary DESC, ta.assigned_at DESC
    `).bind(id).all();

    return c.json({
      success: true,
      trader,
      assignments: assignments.results || [],
    });
  } catch (error: any) {
    console.error('Error fetching trader:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new trader (Super Admin or Company Admin)
tradersRoutes.post('/', authenticate, authorize('users.create'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      name,
      email,
      password,
      trader_code,
      department,
      company_id,
      desk_name,
    } = body;

    if (!name || !email || !password) {
      return c.json({
        success: false,
        error: 'Name, email, and password are required',
      }, 400);
    }

    // Get trader role ID
    const traderRoleId = await getRoleId(c.env.DB, 'trader');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');

    // Company Admin can only create traders for their own company
    let finalCompanyId = company_id;
    if (user.roleId === companyAdminId) {
      const userCompany = await c.env.DB.prepare(`
        SELECT company_id FROM users WHERE id = ?
      `).bind(user.userId).first<{ company_id: number }>();

      if (!userCompany?.company_id) {
        return c.json({
          success: false,
          error: 'User not assigned to a company',
        }, 400);
      }

      finalCompanyId = userCompany.company_id;
    }

    // Hash password (using bcrypt in production)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await c.env.DB.prepare(`
      INSERT INTO users (
        name, email, password, role_id, trader_code,
        department, company_id, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      name,
      email,
      hashedPassword,
      traderRoleId,
      trader_code || null,
      department || null,
      finalCompanyId || null
    ).run();

    const traderId = result.meta.last_row_id;

    // Create trader assignment if company_id provided
    if (finalCompanyId) {
      await c.env.DB.prepare(`
        INSERT INTO trader_assignments (
          user_id, company_id, trader_code, desk_name, is_primary
        )
        VALUES (?, ?, ?, ?, 1)
      `).bind(
        traderId,
        finalCompanyId,
        trader_code || null,
        desk_name || null
      ).run();
    }

    return c.json({
      success: true,
      message: 'Trader created successfully',
      id: traderId,
    }, 201);
  } catch (error: any) {
    console.error('Error creating trader:', error);
    if (error.message?.includes('UNIQUE')) {
      return c.json({
        success: false,
        error: 'Email already exists',
      }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update trader
tradersRoutes.put('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');
    const body = await c.req.json();
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');

    // Check if trader exists
    const trader = await c.env.DB.prepare(`
      SELECT id, company_id FROM users WHERE id = ?
    `).bind(id).first<{ id: number; company_id: number }>();

    if (!trader) {
      return c.json({ success: false, error: 'Trader not found' }, 404);
    }

    // Company Admin can only update their company's traders
    if (user.roleId === companyAdminId) {
      const userCompany = await c.env.DB.prepare(`
        SELECT company_id FROM users WHERE id = ?
      `).bind(user.userId).first<{ company_id: number }>();

      if (trader.company_id !== userCompany?.company_id) {
        return c.json({ success: false, error: 'Access denied' }, 403);
      }
    }

    const {
      name,
      trader_code,
      department,
      is_active,
    } = body;

    await c.env.DB.prepare(`
      UPDATE users
      SET name = ?,
          trader_code = ?,
          department = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name,
      trader_code || null,
      department || null,
      is_active !== undefined ? is_active : 1,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Trader updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating trader:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete trader (soft delete)
tradersRoutes.delete('/:id', authenticate, authorize('users.delete'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');

    // Check if trader exists
    const trader = await c.env.DB.prepare(`
      SELECT id, company_id FROM users WHERE id = ?
    `).bind(id).first<{ id: number; company_id: number }>();

    if (!trader) {
      return c.json({ success: false, error: 'Trader not found' }, 404);
    }

    // Company Admin can only delete their company's traders
    if (user.roleId === companyAdminId) {
      const userCompany = await c.env.DB.prepare(`
        SELECT company_id FROM users WHERE id = ?
      `).bind(user.userId).first<{ company_id: number }>();

      if (trader.company_id !== userCompany?.company_id) {
        return c.json({ success: false, error: 'Access denied' }, 403);
      }
    }

    // Soft delete
    await c.env.DB.prepare(`
      UPDATE users
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: 'Trader deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deleting trader:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { tradersRoutes };

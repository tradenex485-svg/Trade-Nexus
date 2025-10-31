/**
 * Company Management Routes
 * Super Admin: manage all companies
 * Company Admin: manage own company only
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';

const companiesRoutes = new Hono();

// Helper function to check if user can access company
async function canAccessCompany(c: any, companyId: number): Promise<boolean> {
  const user = c.get('user');

  // Use role_id from user object (set by authenticate middleware)
  const roleId = user.role_id || user.roleId;

  // Super Admin can access all companies
  const superAdminId = await getRoleId(c.env.DB, 'super_admin');
  if (roleId === superAdminId) {
    return true;
  }

  // Company Admin can only access their own company
  const companyAdminId = await getRoleId(c.env.DB, 'company_admin');
  if (roleId === companyAdminId) {
    const userCompanyId = user.company_id;
    return userCompanyId === companyId;
  }

  return false;
}

async function getRoleId(db: any, roleName: string): Promise<number> {
  const role = await db.prepare('SELECT id FROM roles WHERE role_name = ?')
    .bind(roleName).first<{ id: number }>();
  return role?.id || 0;
}

// Get all companies (Super Admin) or own company (Company Admin)
companiesRoutes.get('/', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const superAdminId = await getRoleId(c.env.DB, 'super_admin');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');
    const roleId = user.role_id || user.roleId;

    // Only Super Admin and Company Admin can list companies
    if (roleId !== superAdminId && roleId !== companyAdminId) {
      return c.json({
        success: false,
        error: 'Forbidden - Insufficient permissions',
      }, 403);
    }

    let query = `
      SELECT
        c.id, c.exchange_id, c.company_code, c.company_name,
        c.legal_entity_name, c.registration_number, c.address, c.city,
        c.state, c.country, c.postal_code, c.contact_email, c.contact_phone,
        c.compliance_officer_name, c.compliance_officer_email,
        c.is_active, c.onboarding_date, c.created_at, c.updated_at,
        e.exchange_name, e.exchange_code
      FROM companies c
      LEFT JOIN exchanges e ON c.exchange_id = e.id
    `;

    let params: any[] = [];

    // Company Admin sees only their company
    if (roleId === companyAdminId) {
      const userCompanyId = user.company_id;

      if (!userCompanyId) {
        return c.json({
          success: false,
          error: 'User not assigned to a company',
        }, 400);
      }

      query += ' WHERE c.id = ?';
      params.push(userCompanyId);
    }

    query += ' ORDER BY c.company_name';

    const result = await c.env.DB.prepare(query)
      .bind(...params)
      .all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get company by ID
companiesRoutes.get('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (!(await canAccessCompany(c, id))) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const company = await c.env.DB.prepare(`
      SELECT
        c.*, e.exchange_name, e.exchange_code
      FROM companies c
      LEFT JOIN exchanges e ON c.exchange_id = e.id
      WHERE c.id = ?
    `).bind(id).first();

    if (!company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    // Get statistics
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(DISTINCT ta.user_id) as trader_count,
        COUNT(DISTINCT cl.id) as limit_count
      FROM companies c
      LEFT JOIN trader_assignments ta ON c.id = ta.company_id
      LEFT JOIN company_limits cl ON c.id = cl.company_id AND cl.is_active = 1
      WHERE c.id = ?
    `).bind(id).first();

    return c.json({
      success: true,
      company: {
        ...company,
        ...stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new company (Super Admin only)
companiesRoutes.post('/', authenticate, authorize('companies.create'), async (c) => {
  try {
    const body = await c.req.json();
    const {
      exchange_id,
      company_code,
      company_name,
      legal_entity_name,
      registration_number,
      address,
      city,
      state,
      country,
      postal_code,
      contact_email,
      contact_phone,
      compliance_officer_name,
      compliance_officer_email,
      onboarding_date,
    } = body;

    if (!exchange_id || !company_code || !company_name) {
      return c.json({
        success: false,
        error: 'Exchange ID, company code, and name are required',
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO companies (
        exchange_id, company_code, company_name, legal_entity_name,
        registration_number, address, city, state, country, postal_code,
        contact_email, contact_phone, compliance_officer_name,
        compliance_officer_email, onboarding_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      exchange_id,
      company_code,
      company_name,
      legal_entity_name || null,
      registration_number || null,
      address || null,
      city || null,
      state || null,
      country || null,
      postal_code || null,
      contact_email || null,
      contact_phone || null,
      compliance_officer_name || null,
      compliance_officer_email || null,
      onboarding_date || null
    ).run();

    return c.json({
      success: true,
      message: 'Company created successfully',
      id: result.meta.last_row_id,
    }, 201);
  } catch (error: any) {
    console.error('Error creating company:', error);
    if (error.message?.includes('UNIQUE')) {
      return c.json({
        success: false,
        error: 'Company code already exists',
      }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update company
companiesRoutes.put('/:id', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (!(await canAccessCompany(c, id))) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const body = await c.req.json();
    const {
      company_name,
      legal_entity_name,
      registration_number,
      address,
      city,
      state,
      country,
      postal_code,
      contact_email,
      contact_phone,
      compliance_officer_name,
      compliance_officer_email,
      is_active,
    } = body;

    await c.env.DB.prepare(`
      UPDATE companies
      SET company_name = ?,
          legal_entity_name = ?,
          registration_number = ?,
          address = ?,
          city = ?,
          state = ?,
          country = ?,
          postal_code = ?,
          contact_email = ?,
          contact_phone = ?,
          compliance_officer_name = ?,
          compliance_officer_email = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      company_name,
      legal_entity_name || null,
      registration_number || null,
      address || null,
      city || null,
      state || null,
      country || null,
      postal_code || null,
      contact_email || null,
      contact_phone || null,
      compliance_officer_name || null,
      compliance_officer_email || null,
      is_active !== undefined ? is_active : 1,
      id
    ).run();

    return c.json({
      success: true,
      message: 'Company updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get company traders
companiesRoutes.get('/:id/traders', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (!(await canAccessCompany(c, id))) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const result = await c.env.DB.prepare(`
      SELECT
        u.id, u.name, u.email, u.trader_code, u.department,
        ta.desk_name, ta.is_primary, ta.assigned_at,
        r.role_name
      FROM trader_assignments ta
      JOIN users u ON ta.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE ta.company_id = ?
      ORDER BY ta.is_primary DESC, u.name
    `).bind(id).all();

    return c.json({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching company traders:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Assign trader to company
companiesRoutes.post('/:id/traders', authenticate, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (!(await canAccessCompany(c, id))) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const body = await c.req.json();
    const { user_id, trader_code, desk_name, is_primary } = body;

    if (!user_id) {
      return c.json({ success: false, error: 'User ID is required' }, 400);
    }

    // Update user's company_id
    await c.env.DB.prepare(`
      UPDATE users
      SET company_id = ?, trader_code = ?
      WHERE id = ?
    `).bind(id, trader_code || null, user_id).run();

    // Create trader assignment
    await c.env.DB.prepare(`
      INSERT INTO trader_assignments (user_id, company_id, trader_code, desk_name, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `).bind(user_id, id, trader_code || null, desk_name || null, is_primary || 1).run();

    return c.json({
      success: true,
      message: 'Trader assigned successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error assigning trader:', error);
    if (error.message?.includes('UNIQUE')) {
      return c.json({
        success: false,
        error: 'Trader already assigned to this company',
      }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { companiesRoutes };

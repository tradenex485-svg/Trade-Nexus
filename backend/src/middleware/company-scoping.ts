/**
 * Company Scoping Middleware
 * Ensures data isolation between companies in a multi-tenancy environment
 */

import { Context, Next } from 'hono';

type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};

type TokenPayload = {
  userId: number;
  email: string;
  roleId: number;
};

/**
 * Get role ID by role name
 */
async function getRoleId(db: D1Database, roleName: string): Promise<number> {
  const role = await db.prepare('SELECT id FROM roles WHERE role_name = ?')
    .bind(roleName).first<{ id: number }>();
  return role?.id || 0;
}

/**
 * Get user's company ID
 */
async function getUserCompanyId(db: D1Database, userId: number): Promise<number | null> {
  const user = await db.prepare('SELECT company_id FROM users WHERE id = ?')
    .bind(userId).first<{ company_id: number | null }>();
  return user?.company_id || null;
}

/**
 * Middleware to add company scoping context to request
 * This middleware should be applied AFTER authenticate middleware
 */
export async function companyScopingContext(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    const user = c.get('user') as TokenPayload | undefined;

    if (!user) {
      // No user, skip company scoping (auth middleware will handle this)
      await next();
      return;
    }

    const superAdminId = await getRoleId(c.env.DB, 'super_admin');
    const companyAdminId = await getRoleId(c.env.DB, 'company_admin');

    // Determine company scope
    let companyId: number | null = null;
    let isSuperAdmin = false;
    let isCompanyAdmin = false;

    if (user.roleId === superAdminId) {
      // Super Admin: no company restriction (can see all)
      isSuperAdmin = true;
    } else if (user.roleId === companyAdminId) {
      // Company Admin: restricted to their company
      isCompanyAdmin = true;
      companyId = await getUserCompanyId(c.env.DB, user.userId);
    } else {
      // Trader or other roles: restricted to their company
      companyId = await getUserCompanyId(c.env.DB, user.userId);
    }

    // Set company context
    c.set('companyScope', {
      companyId,
      isSuperAdmin,
      isCompanyAdmin,
      canAccessAllCompanies: isSuperAdmin,
    });
  } catch (error: any) {
    console.error('Company scoping context error:', error);

    // Set safe defaults on error - restrict access rather than fail open
    c.set('companyScope', {
      companyId: null,
      isSuperAdmin: false,
      isCompanyAdmin: false,
      canAccessAllCompanies: false,
    });
  }

  await next();
}

/**
 * Get company scope WHERE clause for SQL queries
 */
export function getCompanyScopeWhere(c: Context<{ Bindings: Bindings }>, tableAlias?: string): {
  where: string;
  params: any[];
} {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope || scope.canAccessAllCompanies) {
    // Super Admin or no scope: no restriction
    return { where: '', params: [] };
  }

  if (scope.companyId === null) {
    // User has no company assignment - should not see any data
    return { where: ' AND 1=0', params: [] };
  }

  const column = tableAlias ? `${tableAlias}.company_id` : 'company_id';
  return {
    where: ` AND ${column} = ?`,
    params: [scope.companyId],
  };
}

/**
 * Get company scope WHERE clause that includes NULL company_id records
 * Useful for system-generated alerts and shared resources
 */
export function getCompanyScopeWhereIncludeNull(c: Context<{ Bindings: Bindings }>, tableAlias?: string): {
  where: string;
  params: any[];
} {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope || scope.canAccessAllCompanies) {
    // Super Admin or no scope: no restriction
    return { where: '', params: [] };
  }

  if (scope.companyId === null) {
    // User has no company assignment - can only see NULL company records
    const column = tableAlias ? `${tableAlias}.company_id` : 'company_id';
    return { where: ` AND ${column} IS NULL`, params: [] };
  }

  const column = tableAlias ? `${tableAlias}.company_id` : 'company_id';
  return {
    where: ` AND (${column} IS NULL OR ${column} = ?)`,
    params: [scope.companyId],
  };
}

/**
 * Check if user can access a specific company
 */
export async function canAccessCompany(
  c: Context<{ Bindings: Bindings }>,
  targetCompanyId: number
): Promise<boolean> {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope) {
    return false;
  }

  // Super Admin can access all companies
  if (scope.canAccessAllCompanies) {
    return true;
  }

  // Check if target company matches user's company
  return scope.companyId === targetCompanyId;
}

/**
 * Validate company ID from request body/params and check access
 */
export async function validateCompanyAccess(
  c: Context<{ Bindings: Bindings }>,
  companyId: number
): Promise<{ hasAccess: boolean; error?: string }> {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope) {
    return { hasAccess: false, error: 'Unauthorized' };
  }

  // Super Admin can access any company
  if (scope.canAccessAllCompanies) {
    return { hasAccess: true };
  }

  // User must have a company assignment
  if (scope.companyId === null) {
    return { hasAccess: false, error: 'User not assigned to a company' };
  }

  // Company ID must match user's company
  if (scope.companyId !== companyId) {
    return { hasAccess: false, error: 'Access denied - company mismatch' };
  }

  return { hasAccess: true };
}

/**
 * Ensure company_id is set in request body based on user's scope
 * For non-Super Admin users, this overrides any company_id in the request
 */
export function enforceCompanyId(
  c: Context<{ Bindings: Bindings }>,
  body: any
): number | null {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope) {
    return null;
  }

  // Super Admin can specify any company_id
  if (scope.canAccessAllCompanies) {
    return body.company_id || null;
  }

  // All other users: enforce their company_id
  return scope.companyId;
}

/**
 * Middleware to ensure trader operations are scoped to their company
 */
export async function requireTraderCompanyScope(c: Context<{ Bindings: Bindings }>, next: Next) {
  const scope = c.get('companyScope') as {
    companyId: number | null;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    canAccessAllCompanies: boolean;
  } | undefined;

  if (!scope || (!scope.canAccessAllCompanies && scope.companyId === null)) {
    return c.json({
      success: false,
      error: 'User not assigned to a company',
    }, 403);
  }

  await next();
}

/**
 * Role Configuration
 * Centralized role definitions to avoid magic numbers
 */

export const ROLES = {
  SUPER_ADMIN: 1,
  SYSTEM_ADMIN: 2,
  COMPANY_ADMIN: 3,
  TRADER: 4,
  COMPLIANCE_OFFICER: 5,
  AUDITOR: 6,
} as const;

export const ROLE_NAMES = {
  1: 'super_admin',
  2: 'system_admin',
  3: 'company_admin',
  4: 'trader',
  5: 'compliance_officer',
  6: 'auditor',
} as const;

/**
 * Check if a role ID is a super admin
 */
export function isSuperAdmin(roleId: number): boolean {
  return roleId === ROLES.SUPER_ADMIN;
}

/**
 * Check if a role ID is a system admin
 */
export function isSystemAdmin(roleId: number): boolean {
  return roleId === ROLES.SYSTEM_ADMIN;
}

/**
 * Check if a role ID is a company admin
 */
export function isCompanyAdmin(roleId: number): boolean {
  return roleId === ROLES.COMPANY_ADMIN;
}

/**
 * Check if a role has admin privileges (super, system, or company admin)
 */
export function isAdmin(roleId: number): boolean {
  return (
    roleId === ROLES.SUPER_ADMIN ||
    roleId === ROLES.SYSTEM_ADMIN ||
    roleId === ROLES.COMPANY_ADMIN
  );
}

/**
 * Check if a role can access cross-company data
 */
export function canAccessCrossCompanyData(roleId: number): boolean {
  return roleId === ROLES.SUPER_ADMIN || roleId === ROLES.SYSTEM_ADMIN;
}

/**
 * Get role name from role ID
 */
export function getRoleName(roleId: number): string {
  return ROLE_NAMES[roleId as keyof typeof ROLE_NAMES] || 'unknown';
}

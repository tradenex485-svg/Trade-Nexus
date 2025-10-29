/**
 * Centralized Validation Schemas
 * All Zod schemas for request validation across the application
 */

import { z } from 'zod';

// ============================================================================
// Common/Shared Schemas
// ============================================================================

export const PaginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ============================================================================
// Authentication & User Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
});

export const RegisterSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  role_id: z.number().int().positive(),
  company_id: z.number().int().positive().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role_id: z.number().int().positive().optional(),
  company_id: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email().max(255),
});

export const PasswordResetSchema = z.object({
  email: z.string().email().max(255),
  resetCode: z.string().length(6),
  newPassword: z.string().min(8).max(255),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(255),
});

// ============================================================================
// Transaction Schemas
// ============================================================================

export const TransactionSchema = z.object({
  market_location: z.string().min(1).max(255),
  contract_month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/), // YYYY-MM or YYYY-MM-DD
  base_delta_notnl_nd: z.number(),
  trade_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  index_uom: z.enum(['MMBtu', 'MWh', 'BBL', 'MT', 'lots']),
  exchange: z.enum(['ICE', 'CME', 'NYMEX', 'COMEX', 'CBT', 'other']).optional(),
  trader_id: z.number().int().positive().optional(),
  company_id: z.number().int().positive().optional(),
});

export const BulkTransactionSchema = z.object({
  transactions: z.array(TransactionSchema).min(1).max(10000),
});

export const TransactionQuerySchema = z.object({
  market_location: z.string().optional(),
  contract_month: z.string().optional(),
  trade_date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  trade_date_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  trader_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  ...PaginationSchema.shape,
});

// ============================================================================
// Position Limit Schemas
// ============================================================================

export const PositionLimitQuerySchema = z.object({
  limit_type: z.enum(['1', '2', '3']).optional(),
  commodity_code: z.string().max(10).optional(),
  prioritization: z.enum(['monitor', 'validate', 'remediate', 'breached']).optional(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ...PaginationSchema.shape,
});

export const MarketLimitSchema = z.object({
  commodity_code: z.string().min(1).max(10),
  contract_name: z.string().min(1).max(255),
  spot_month_limit: z.number().int().positive(),
  single_month_limit: z.number().int().positive().optional(),
  all_months_limit: z.number().int().positive().optional(),
  exchange: z.string().max(50).optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const UpdateMarketLimitSchema = MarketLimitSchema.partial();

// ============================================================================
// Alert Schemas
// ============================================================================

export const AlertQuerySchema = z.object({
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  read: z.enum(['0', '1']).optional(),
  acknowledged: z.enum(['0', '1']).optional(),
  commodity_code: z.string().optional(),
  ...PaginationSchema.shape,
});

export const AlertRuleSchema = z.object({
  rule_name: z.string().min(1).max(255),
  alert_type: z.string().min(1).max(50),
  threshold_pct: z.number().min(0).max(999),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  is_active: z.boolean(),
  notify_email: z.boolean(),
  notify_sms: z.boolean(),
});

export const AcknowledgeAlertSchema = z.object({
  notes: z.string().max(1000).optional(),
});

// ============================================================================
// Exemption Schemas
// ============================================================================

export const ExemptionSchema = z.object({
  commodity_code: z.string().min(1).max(10),
  exemption_type: z.enum(['bona_fide_hedging', 'spread_exemption', 'risk_management', 'other']),
  lots_exempted: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  justification: z.string().min(1).max(2000),
  approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  supporting_documents: z.string().optional(),
});

export const UpdateExemptionSchema = ExemptionSchema.partial();

export const ApproveExemptionSchema = z.object({
  approval_status: z.enum(['approved', 'rejected']),
  approval_notes: z.string().max(1000).optional(),
});

// ============================================================================
// Company & Trader Schemas
// ============================================================================

export const CompanySchema = z.object({
  name: z.string().min(1).max(255),
  company_type: z.enum(['trading_firm', 'broker', 'bank', 'hedge_fund', 'other']),
  lei_code: z.string().max(20).optional(),
  primary_contact_email: z.string().email().max(255).optional(),
  is_active: z.boolean().optional(),
});

export const UpdateCompanySchema = CompanySchema.partial();

export const TraderSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  trader_id_external: z.string().max(50).optional(),
  company_id: z.number().int().positive(),
  is_active: z.boolean().optional(),
});

export const UpdateTraderSchema = TraderSchema.partial();

// ============================================================================
// API Key Schemas
// ============================================================================

export const CreateAPIKeySchema = z.object({
  key_name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rate_limit: z.number().int().positive().max(10000).optional(),
});

export const UpdateAPIKeySchema = z.object({
  key_name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  rate_limit: z.number().int().positive().max(10000).optional(),
});

// ============================================================================
// Regulatory Filing Schemas
// ============================================================================

export const RegulatoryFilingSchema = z.object({
  filing_type: z.enum(['CFTC_Form_40', 'ICE_Report', 'CME_Report', 'other']),
  reporting_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reporting_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['pending', 'generated', 'submitted', 'accepted', 'rejected']).optional(),
});

export const SubmitFilingSchema = z.object({
  submission_notes: z.string().max(1000).optional(),
});

// ============================================================================
// Report Schemas
// ============================================================================

export const ReportQuerySchema = z.object({
  report_type: z.enum(['position_summary', 'breach_report', 'regulatory_filing', 'audit_log', 'custom']).optional(),
  date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
  ...PaginationSchema.shape,
});

// ============================================================================
// Pre-Trade Validation Schemas
// ============================================================================

export const PreTradeValidationSchema = z.object({
  commodity_code: z.string().min(1).max(10),
  market_location: z.string().min(1).max(255),
  contract_month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  proposed_lots: z.number(),
  trade_type: z.enum(['buy', 'sell']),
  trader_id: z.number().int().positive().optional(),
});

// ============================================================================
// Risk Scenario Schemas
// ============================================================================

export const RiskScenarioSchema = z.object({
  scenario_name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  market_shock_pct: z.number().min(-100).max(1000),
  commodities: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const UpdateRiskScenarioSchema = RiskScenarioSchema.partial();

// ============================================================================
// Data Quality Schemas
// ============================================================================

export const DataQualityCheckSchema = z.object({
  check_type: z.enum(['completeness', 'accuracy', 'consistency', 'timeliness']),
  target_table: z.string().min(1).max(100),
  check_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ============================================================================
// CSV Import Schemas
// ============================================================================

export const CSVImportConfigSchema = z.object({
  import_type: z.enum(['transactions', 'market_limits', 'exemptions', 'traders']),
  skip_header: z.boolean().optional().default(true),
  delimiter: z.enum([',', ';', '\t']).optional().default(','),
  date_format: z.string().optional().default('YYYY-MM-DD'),
  dry_run: z.boolean().optional().default(false),
});

// ============================================================================
// Export types for use in routes
// ============================================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type MarketLimitInput = z.infer<typeof MarketLimitSchema>;
export type AlertRuleInput = z.infer<typeof AlertRuleSchema>;
export type ExemptionInput = z.infer<typeof ExemptionSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
export type TraderInput = z.infer<typeof TraderSchema>;
export type APIKeyInput = z.infer<typeof CreateAPIKeySchema>;
export type RegulatoryFilingInput = z.infer<typeof RegulatoryFilingSchema>;
export type PreTradeValidationInput = z.infer<typeof PreTradeValidationSchema>;
export type RiskScenarioInput = z.infer<typeof RiskScenarioSchema>;

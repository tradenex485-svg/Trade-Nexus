/**
 * Monitoring API Client
 * Handles regulatory monitoring, breach tracking, and compliance reporting
 */

import { apiFetch } from './client';

export interface MonitoringHistory {
  id: number;
  cycle_start: string;
  cycle_end: string;
  positions_checked: number;
  breaches_detected: number;
  alerts_generated: number;
  status: string;
}

export interface BreachEvent {
  id: number;
  company_id: number | null;
  trader_id: number | null;
  limit_calculation_id: number;
  regulatory_rule_id: number;
  breach_type: string;
  commodity_code: string;
  market_location: string;
  contract_month: string;
  limit_type: number;
  position_lots: number;
  limit_value: number;
  utilization_pct: number;
  breach_amount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved';
  detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  metadata: string;
  rule_code: string;
  rule_name: string;
  rule_reference: string;
  enforcement_action: string;
  exchange_code: string;
  exchange_name: string;
  company_name: string | null;
  trader_name: string | null;
}

export interface BreachDetail extends BreachEvent {
  rule_type: string;
  pos_lots: number;
  pos_pct: number;
  prioritization: string;
}

export interface BreachFilters {
  severity?: 'critical' | 'high' | 'medium' | 'low';
  commodityCode?: string;
  exchangeId?: number;
  limit?: number;
}

export interface UpdateBreachData {
  status: 'acknowledged' | 'resolved';
  resolution_notes?: string;
}

export interface MonitoringRunResult {
  timestamp: string;
  calculations_updated: number;
  new_breaches: number;
  alerts_generated: number;
  avg_utilization: number;
  compliance_score: number;
}

export interface ComplianceAuditFilters {
  startDate?: string;
  endDate?: string;
  exchangeId?: number;
  commodityCode?: string;
  days?: number;
}

export interface ComplianceAudit {
  audit_date: string;
  compliance_score: number;
  audit_status: 'pass' | 'fail';
  total_positions: number;
  breached_positions: number | null;
  accountability_positions: number | null;
  total_violations: number;
  critical_violations: number;
  resolved_violations: number;
  pending_violations: number;
}

export interface DataQualityIssue {
  id: number;
  check_type: string;
  severity: string;
  description: string;
  detected_at: string;
}

export interface MonitoringStats {
  last_monitoring_cycle: string | null;
  positions: {
    total_positions: number;
    breached: number;
    warning: number;
    caution: number;
    avg_utilization: number;
  };
  breaches: {
    total_open_breaches: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts_24h: {
    total_alerts: number;
    unacknowledged: number;
  };
  timestamp: string;
}

export const monitoringApi = {
  /**
   * GET /api/monitoring/history
   * Get recent monitoring cycle results
   */
  getHistory: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return apiFetch<{
      success: boolean;
      count: number;
      data: MonitoringHistory[];
    }>(`/api/monitoring/history${params.toString() ? `?${params}` : ''}`);
  },

  /**
   * GET /api/monitoring/breaches
   * Get open breach events with optional filtering
   */
  getBreaches: (filters?: BreachFilters) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.commodityCode) params.append('commodityCode', filters.commodityCode);
    if (filters?.exchangeId) params.append('exchangeId', filters.exchangeId.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return apiFetch<{
      success: boolean;
      total: number;
      severity_counts: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      data: BreachEvent[];
    }>(`/api/monitoring/breaches${params.toString() ? `?${params}` : ''}`);
  },

  /**
   * GET /api/monitoring/breaches/:id
   * Get detailed information about a specific breach
   */
  getBreachDetails: (id: number) => {
    return apiFetch<{
      success: boolean;
      data: BreachDetail;
    }>(`/api/monitoring/breaches/${id}`);
  },

  /**
   * PATCH /api/monitoring/breaches/:id
   * Update breach status (acknowledge or resolve)
   */
  updateBreach: (id: number, data: UpdateBreachData) => {
    return apiFetch<{
      success: boolean;
      message: string;
    }>(`/api/monitoring/breaches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/monitoring/run
   * Manually trigger a monitoring cycle
   */
  runMonitoring: () => {
    return apiFetch<{
      success: boolean;
      message: string;
      data: MonitoringRunResult;
    }>('/api/monitoring/run', {
      method: 'POST',
    });
  },

  /**
   * GET /api/monitoring/compliance/audit
   * Generate compliance audit report
   */
  getComplianceAudit: (filters?: ComplianceAuditFilters) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.exchangeId) params.append('exchangeId', filters.exchangeId.toString());
    if (filters?.commodityCode) params.append('commodityCode', filters.commodityCode);
    if (filters?.days) params.append('days', filters.days.toString());

    return apiFetch<{
      success: boolean;
      data: ComplianceAudit;
    }>(`/api/monitoring/compliance/audit${params.toString() ? `?${params}` : ''}`);
  },

  /**
   * GET /api/monitoring/data-quality
   * Get data quality issues and validation results
   */
  getDataQuality: () => {
    return apiFetch<{
      success: boolean;
      healthy: boolean;
      issues_found: number;
      data: DataQualityIssue[];
    }>('/api/monitoring/data-quality');
  },

  /**
   * GET /api/monitoring/stats
   * Get overall monitoring statistics
   */
  getStats: () => {
    return apiFetch<{
      success: boolean;
      data: MonitoringStats;
    }>('/api/monitoring/stats');
  },
};

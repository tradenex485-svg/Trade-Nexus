/**
 * API Index
 * Central export point for all API modules
 * Provides backward compatibility with the old monolithic api.ts
 */

// Export shared utilities
export { apiFetch, API_BASE_URL } from './client';
export type { ApiResponse, ApiError, PaginationParams, DateRangeParams, FilterParams } from './types';

// Export Auth & Users
export { authApi, usersApi } from './auth.api';

// Export Positions & Trading
export { positionLimitsApi, transactionsApi, marketLimitsApi } from './positions.api';

// Export Dashboard & Monitoring
export { dashboardApi, performanceApi, monitoringApi } from './dashboard.api';

// Export Alerts
export { alertsApi } from './alerts.api';

// Export Risk Management
export { preTradeApi, riskThresholdsApi, riskScenariosApi, riskMetricsApi } from './risk.api';

// Export Compliance
export { exemptionsApi, hedgeExemptionsApi, filingsApi, dataQualityApi } from './compliance.api';

// Export Reports
export { reportsApi, subsetReportsApi } from './reports.api';

// Export Workflows
export { approvalsApi, approvalWorkflowsApi } from './workflows.api';

// Export Admin
export { exchangesApi, companiesApi, tradersApi, apiKeysApi } from './admin.api';

// Export Documents & Support
export { documentsApi, supportApi, subscriptionsApi } from './documents.api';

// Export Financial
export { financialApi } from './financial.api';

// Export Security & Audit
export { securityApi, auditTrailApi, exceptionsApi } from './security.api';

// Export Data Import & Aggregation
export { dataImportApi, aggregationApi, csvImportApi } from './data.api';

// Export CFTC
export { monthlySchedulesApi, bidWeekApi, preTradeValidationApi } from './cftc.api';

// For backward compatibility with alertsApiEnhanced
export { alertsApi as alertsApiEnhanced } from './alerts.api';

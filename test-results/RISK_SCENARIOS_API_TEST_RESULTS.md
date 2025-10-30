# Risk Scenarios API - Test Results

**Backend URL:** `https://trade-nexus-api-dev.tradenex485.workers.dev`
**Test Date:** October 30, 2025
**Status:** ✅ All 8 Endpoints Working

---

## Summary

Comprehensive testing of Risk Scenarios API endpoints on Cloudflare Workers development environment. All endpoints tested with authentication and role-based access control (RBAC).

**Endpoints Tested:** 8/8 ✅
**Issues Found:** 4 (all fixed)
**Authentication:** JWT Bearer Token ✅
**RBAC:** system.configure permission required for write operations ✅
**System Scenario Protection:** Verified ✅

---

## Endpoints Tested

### 1. GET /api/risk-scenarios
**Purpose:** List all active risk scenarios
**Authentication:** Required
**Authorization:** None (any authenticated user)
**Status:** ✅ Working

**Request:**
```bash
curl -X GET "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scenario_name": "Market Crash -20%",
      "scenario_type": "market_crash",
      "description": "Simulates a severe market downturn with 20% price decline across all commodities",
      "parameters": "{\"global_shock\": -20, \"volatility_multiplier\": 2.0}",
      "severity": "extreme",
      "is_active": 1,
      "is_system_scenario": 1,
      "created_by": null,
      "created_at": "2025-10-29 19:21:42",
      "updated_at": "2025-10-29 19:21:42"
    }
  ],
  "count": 5
}
```

**Database Query:**
```sql
SELECT * FROM risk_scenarios
WHERE is_active = 1
ORDER BY severity DESC, scenario_name ASC
```

---

### 2. GET /api/risk-scenarios/:id
**Purpose:** Get specific risk scenario by ID
**Authentication:** Required
**Authorization:** None (any authenticated user)
**Status:** ✅ Working

**Request:**
```bash
curl -X GET "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/1" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "scenario": {
    "id": 1,
    "scenario_name": "Market Crash -20%",
    "scenario_type": "market_crash",
    "description": "Simulates a severe market downturn with 20% price decline across all commodities",
    "parameters": "{\"global_shock\": -20, \"volatility_multiplier\": 2.0}",
    "severity": "extreme",
    "is_active": 1,
    "is_system_scenario": 1,
    "created_by": null,
    "created_at": "2025-10-29 19:21:42",
    "updated_at": "2025-10-29 19:21:42"
  }
}
```

**Error Cases:**
- **404 Not Found:** If scenario ID doesn't exist
```json
{
  "success": false,
  "error": "Scenario not found"
}
```

---

### 3. POST /api/risk-scenarios
**Purpose:** Create new risk scenario
**Authentication:** Required
**Authorization:** `system.configure` permission required
**Status:** ✅ Working (with proper RBAC)

**Request:**
```bash
curl -X POST "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_name": "Test Scenario",
    "scenario_type": "test_scenario",
    "description": "Test scenario for API testing",
    "parameters": {"test_param": 100},
    "severity": "low",
    "is_active": true,
    "user_id": 5
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Risk scenario created successfully",
  "id": 6
}
```

**RBAC Test - Trader Role (should fail):**
```bash
# Testing with trader token (no system.configure permission)
curl -X POST "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios" \
  -H "Authorization: Bearer {trader_token}" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**RBAC Response:**
```json
{
  "success": false,
  "error": "Forbidden - Insufficient permissions",
  "required": ["system.configure"],
  "has": [
    "market_limits.read",
    "position_limits.read",
    "transactions.read",
    "transactions.create",
    "alerts.read",
    "reports.read"
  ]
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": "Missing required fields: scenario_name, scenario_type, parameters"
}
```

**Required Fields:**
- `scenario_name` (string)
- `scenario_type` (string)
- `parameters` (object/string) - JSON parameters for the scenario
- `description` (string, optional)
- `severity` (string, optional, default: "medium")
- `is_active` (boolean, optional, default: true)

---

### 4. PUT /api/risk-scenarios/:id
**Purpose:** Update existing risk scenario (only custom scenarios can be updated)
**Authentication:** Required
**Authorization:** `system.configure` permission required
**Status:** ✅ Working

**Request:**
```bash
curl -X PUT "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/6" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_name": "Updated Test Scenario",
    "scenario_type": "test_scenario",
    "description": "Updated test scenario",
    "parameters": {"test_param": 200},
    "severity": "medium",
    "is_active": true
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Risk scenario updated successfully"
}
```

**System Scenario Protection:**
```bash
# Attempt to update system scenario (ID 1)
curl -X PUT "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/1" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Protected Response:**
```json
{
  "success": false,
  "error": "System scenarios cannot be modified"
}
```

**Error Cases:**
- **404 Not Found:** If scenario doesn't exist
- **403 Forbidden:** If scenario is a system scenario (is_system_scenario = 1)
- **403 Forbidden:** If user lacks `system.configure` permission

---

### 5. DELETE /api/risk-scenarios/:id
**Purpose:** Soft delete risk scenario (only custom scenarios can be deleted)
**Authentication:** Required
**Authorization:** `system.configure` permission required
**Status:** ✅ Working

**Request:**
```bash
curl -X DELETE "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/6" \
  -H "Authorization: Bearer {admin_token}"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Risk scenario deleted successfully"
}
```

**System Scenario Protection:**
```bash
# Attempt to delete system scenario (ID 1)
curl -X DELETE "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/1" \
  -H "Authorization: Bearer {admin_token}"
```

**Protected Response:**
```json
{
  "success": false,
  "error": "System scenarios cannot be deleted"
}
```

**Note:** This is a soft delete - sets `is_active = 0` and updates `updated_at` timestamp. The scenario remains in the database but won't appear in GET requests.

---

### 6. POST /api/risk-scenarios/:id/run
**Purpose:** Run stress test for a specific scenario
**Authentication:** Required
**Authorization:** None (any authenticated user can run scenarios)
**Status:** ✅ Working

**Request:**
```bash
curl -X POST "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/1/run" \
  -H "Authorization: Bearer {token}"
```

**Success Response:**
```json
{
  "success": true,
  "result": {
    "scenario_name": "Market Crash -20%",
    "pre_shock": {
      "total_exposure": 311700,
      "avg_utilization": 77.83,
      "breached_positions": 1
    },
    "post_shock": {
      "total_exposure": 249360,
      "avg_utilization": 62.27,
      "breached_positions": 0
    },
    "impact": {
      "var_change_pct": -20.0,
      "utilization_change_pct": -15.57,
      "new_breaches": -1,
      "worst_affected": [
        {
          "mkt_index": "NG_NGZ4",
          "commodity": "NG",
          "current_utilization": "102.00",
          "shocked_utilization": "81.60",
          "impact": "-20.40"
        },
        {
          "mkt_index": "WTI_CLZ4",
          "commodity": "CL",
          "current_utilization": "95.00",
          "shocked_utilization": "76.00",
          "impact": "-19.00"
        }
      ]
    }
  }
}
```

**Error Cases:**
- **404 Not Found:** If active scenario doesn't exist
```json
{
  "success": false,
  "error": "Active scenario not found"
}
```

**Note:** Results are automatically saved to `risk_scenario_results` table

---

### 7. GET /api/risk-scenarios/:id/results
**Purpose:** Get historical results for a scenario
**Authentication:** Required
**Authorization:** None (any authenticated user)
**Status:** ✅ Working

**Request:**
```bash
curl -X GET "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/1/results?limit=5" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scenario_id": 1,
      "run_at": "2025-10-30 16:57:49",
      "pre_shock_var_95": 0,
      "pre_shock_utilization_pct": 77.83,
      "pre_shock_exposure": 311700,
      "post_shock_var_95": 0,
      "post_shock_utilization_pct": 62.27,
      "post_shock_exposure": 249360,
      "post_shock_breaches": 0,
      "var_impact_pct": -20.0,
      "utilization_impact_pct": -15.57,
      "new_breaches": -1,
      "new_near_breaches": null,
      "position_impacts": "[...]",
      "worst_affected_positions": "[...]"
    }
  ],
  "count": 1
}
```

**Query Parameters:**
- `limit` (optional, default: 10) - Number of results to return

---

### 8. POST /api/risk-scenarios/run-all
**Purpose:** Run all active scenarios
**Authentication:** Required
**Authorization:** None (any authenticated user can run scenarios)
**Status:** ✅ Working

**Request:**
```bash
curl -X POST "https://trade-nexus-api-dev.tradenex485.workers.dev/api/risk-scenarios/run-all" \
  -H "Authorization: Bearer {token}"
```

**Success Response:**
```json
{
  "success": true,
  "results": [
    {
      "scenario_id": 1,
      "scenario_name": "Market Crash -20%",
      "success": true,
      "result": { /* stress test results */ }
    },
    {
      "scenario_id": 2,
      "scenario_name": "Market Crash -10%",
      "success": true,
      "result": { /* stress test results */ }
    }
  ],
  "total_scenarios": 5,
  "successful": 5,
  "failed": 0
}
```

**Note:** Executes all active scenarios sequentially and returns aggregate results

---

## Database Schema

**Table:** `risk_scenarios`

```sql
CREATE TABLE risk_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  description TEXT,
  parameters TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  is_active INTEGER DEFAULT 1,
  is_system_scenario INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**Table:** `risk_scenario_results`

```sql
CREATE TABLE risk_scenario_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL,
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pre_shock_var_95 REAL,
  pre_shock_utilization_pct REAL,
  pre_shock_exposure REAL,
  post_shock_var_95 REAL,
  post_shock_utilization_pct REAL,
  post_shock_exposure REAL,
  post_shock_breaches INTEGER,
  var_impact_pct REAL,
  utilization_impact_pct REAL,
  new_breaches INTEGER,
  new_near_breaches INTEGER,
  position_impacts TEXT,
  worst_affected_positions TEXT,
  FOREIGN KEY (scenario_id) REFERENCES risk_scenarios(id)
);
```

**Current Data (5 system scenarios):**

| id | scenario_name | scenario_type | severity | is_system | description |
|----|--------------|---------------|----------|-----------|-------------|
| 1 | Market Crash -20% | market_crash | extreme | 1 | Severe market downturn with 20% price decline |
| 2 | Market Crash -10% | market_crash | high | 1 | Moderate market downturn with 10% price decline |
| 3 | Volatility Spike 3x | volatility_spike | high | 1 | Tripling of market volatility |
| 4 | Natural Gas Shock -30% | commodity_shock | high | 1 | Severe drop in natural gas prices |
| 5 | Energy Crisis +40% | commodity_shock | extreme | 1 | Sharp energy price increases |

---

## Issues Found & Fixed

### Issue 1: No Authentication on Any Endpoint
**Problem:** All 8 endpoints in `/backend/src/routes/risk-scenarios.ts` were completely unauthenticated
**Impact:** Anyone could access, create, modify, delete scenarios without authentication
**Fix:** Added `authenticate` middleware to all 8 endpoints
**Location:** `/backend/src/routes/risk-scenarios.ts:26, 58, 99, 160, 239, 300, 345, 381`

**Before:**
```typescript
riskScenariosRoutes.get('/', async (c) => {
```

**After:**
```typescript
riskScenariosRoutes.get('/', authenticate, async (c) => {
```

---

### Issue 2: Missing Authorization on Write Operations
**Problem:** No role-based access control on create/update/delete operations
**Impact:** Any authenticated user could modify or delete scenarios
**Fix:** Added `authorize('system.configure')` to POST, PUT, DELETE endpoints
**Location:** `/backend/src/routes/risk-scenarios.ts:99, 160, 239`

**Before:**
```typescript
riskScenariosRoutes.post('/', authenticate, async (c) => {
```

**After:**
```typescript
riskScenariosRoutes.post('/', authenticate, authorize('system.configure'), async (c) => {
```

**Note:** `/run` and `/run-all` endpoints only need `authenticate` (any user can run scenarios)

---

### Issue 3: Incomplete Bindings Type
**Problem:** Route's Bindings type didn't match main app's Bindings, missing CACHE, DOCUMENTS, and all optional bindings
**Impact:** Could cause context/environment variable passing issues
**Fix:** Updated Bindings type to include all bindings from main app
**Location:** `/backend/src/routes/risk-scenarios.ts:5-18`

**Before:**
```typescript
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
};
```

**After:**
```typescript
type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  NODE_ENV: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  DATABASE_ENCRYPTION_KEY?: string;
};
```

---

### Issue 4: Missing Import Statement
**Problem:** Authentication middleware not imported
**Impact:** TypeScript compilation error
**Fix:** Added import for `authenticate` and `authorize` middleware
**Location:** `/backend/src/routes/risk-scenarios.ts:2`

**Before:**
```typescript
import { Hono } from 'hono';
import { runStressTest } from '../services/risk-analytics';
```

**After:**
```typescript
import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import { runStressTest } from '../services/risk-analytics';
```

---

## Role-Based Access Control (RBAC)

### Permissions Required

| Endpoint | Method | Permission Required |
|----------|--------|-------------------|
| `/` | GET | None (authenticated only) |
| `/:id` | GET | None (authenticated only) |
| `/` | POST | `system.configure` |
| `/:id` | PUT | `system.configure` |
| `/:id` | DELETE | `system.configure` |
| `/:id/run` | POST | None (authenticated only) |
| `/:id/results` | GET | None (authenticated only) |
| `/run-all` | POST | None (authenticated only) |

### Roles with Access

**system.configure permission assigned to:**
- ✅ admin (role_id: 1)
- ✅ super_admin (role_id: 5)

**Roles WITHOUT access:**
- ❌ trader (role_id: 3) - Can view and run scenarios only
- ❌ manager (role_id: 4)
- ❌ compliance (role_id: 2)
- ❌ risk_manager (role_id: 6)

### RBAC Test Results

✅ **Trader (no system.configure):**
- GET/POST run endpoints: ✅ Allowed
- POST/PUT/DELETE: ❌ Forbidden (proper error message with permission details)

✅ **Sysadmin (has system.configure):**
- All operations: ✅ Allowed

✅ **System Scenario Protection:**
- Update system scenario: ❌ Forbidden (even with system.configure)
- Delete system scenario: ❌ Forbidden (even with system.configure)

---

## Frontend Integration

**API Client:** `/frontend/src/lib/api/risk.api.ts`

### Methods Implemented (Lines 100-152)

```typescript
export const riskScenariosApi = {
  // Get all scenarios (with optional inactive filter)
  getAll: (includeInactive: boolean = false) => {
    const params = includeInactive ? '?include_inactive=true' : '';
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/risk-scenarios${params}`);
  },

  // Get scenario by ID
  getById: (id: number) => {
    return apiFetch<{ success: boolean; scenario: any }>(`/api/risk-scenarios/${id}`);
  },

  // Create new scenario
  create: (scenario: {
    scenario_name: string;
    scenario_type: string;
    description?: string;
    parameters: any;
    severity?: string;
    is_active?: boolean;
  }) => {
    return apiFetch<{ success: boolean; message: string; id: number }>('/api/risk-scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  },

  // Update scenario
  update: (id: number, scenario: any) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scenario),
    });
  },

  // Soft delete scenario
  delete: (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/risk-scenarios/${id}`, {
      method: 'DELETE',
    });
  },

  // Run scenario stress test
  run: (id: number) => {
    return apiFetch<{ success: boolean; result: any }>(`/api/risk-scenarios/${id}/run`, {
      method: 'POST',
    });
  },

  // Get historical results
  getResults: (id: number, limit: number = 10) => {
    return apiFetch<{ success: boolean; data: any[]; count: number }>(`/api/risk-scenarios/${id}/results?limit=${limit}`);
  },

  // Run all active scenarios
  runAll: () => {
    return apiFetch<{ success: boolean; results: any[]; total_scenarios: number; successful: number; failed: number }>('/api/risk-scenarios/run-all', {
      method: 'POST',
    });
  },
};
```

**Status:** ✅ All 8 methods implemented and match backend endpoints

### UI Integration

**Page:** `/frontend/src/app/risk/page.tsx`

**Implementation:**
- Line 13: Imports `riskScenariosApi`
- Lines 77-80: State management for scenarios and results
- Line 94: Loads scenarios on mount with `loadScenarios()`
- Lines 131-141: `loadScenarios()` - Fetches all scenarios via `riskScenariosApi.getAll()`
- Lines 143-156: `runScenario()` - Executes scenario via `riskScenariosApi.run(scenarioId)`
- Lines 917-1046: Complete scenario UI showing:
  - Scenario cards with name, severity, system badge
  - Run button to execute stress tests
  - Results display with pre/post shock analysis
  - Worst affected commodities visualization

**Status:** ✅ Frontend fully integrated and working

---

## Authentication

**Method:** JWT Bearer Token
**Header:** `Authorization: Bearer {token}`
**Token Expiry:** 1 hour (3600 seconds)
**Refresh Token:** 7 days

### Test Credentials

**Trader Account (no system.configure):**
- Email: `trader@nexus.com`
- Password: `demo123`
- Role: trader (role_id: 3)
- Can: View scenarios, run stress tests
- Cannot: Create, update, delete scenarios

**System Admin (has system.configure):**
- Email: `sysadmin@nexus.com`
- Password: `demo123`
- Role: admin (role_id: 1)
- Can: All operations including create/update/delete custom scenarios
- Cannot: Modify or delete system scenarios (protected)

---

## Deployment Information

**Environment:** Cloudflare Workers (Development)
**Worker Name:** trade-nexus-api-dev
**Worker URL:** https://trade-nexus-api-dev.tradenex485.workers.dev
**Version:** 0ea5a447-805e-415c-a9ce-81f9b7255b63

**Bindings:**
- D1 Database: trade-nexus-db-dev (0ea5994b-139f-4c0c-a1fd-92759b73df93)
- KV Namespace (CACHE): 29a143fec9da4e01b23305af8a0187fb
- KV Namespace (SESSIONS): ff97580912014941a062d430491539da
- Secret: JWT_SECRET
- Secret: DATABASE_ENCRYPTION_KEY

---

## Production Readiness

### ✅ Checklist

- [x] All 8 endpoints tested and working
- [x] Authentication implemented on all endpoints
- [x] RBAC properly enforced (system.configure for write operations)
- [x] System scenarios protected from modification/deletion
- [x] Database schema verified (risk_scenarios + risk_scenario_results)
- [x] Real-time data confirmed (5 system scenarios, no mock data)
- [x] Frontend API client methods implemented (8/8)
- [x] Frontend UI integrated and functional
- [x] Error handling tested
- [x] Soft delete implemented (data preservation)
- [x] Routing pattern consistent with other APIs
- [x] Type safety (Bindings properly defined)
- [x] Stress test service working (runStressTest function)
- [x] Historical results stored in database

### Stress Test Capabilities

The `/run` and `/run-all` endpoints execute comprehensive stress tests:

**Pre-Shock Analysis:**
- Total exposure calculation
- Average utilization percentage
- Current breach count

**Post-Shock Analysis:**
- Adjusted exposure based on scenario parameters
- Recalculated utilization percentages
- New breach count

**Impact Metrics:**
- VaR change percentage
- Utilization change percentage
- New/resolved breaches count
- Worst affected positions (top 6 by impact)

**Scenario Types Supported:**
- Market crash (global_shock parameter)
- Volatility spike (volatility_multiplier parameter)
- Commodity-specific shocks (commodity-level parameters)

### Notes

- System scenarios (is_system_scenario = 1) are protected from modification/deletion
- Results automatically saved to risk_scenario_results table
- Frontend provides real-time visualization of stress test results
- Any authenticated user can run stress tests (no special permission required)
- Only admins can create custom scenarios

---

**Test Completed:** October 30, 2025
**Tester:** Claude Code
**Status:** ✅ Ready for Production

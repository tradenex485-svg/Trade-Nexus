# CFTC Components

Components for CFTC (Commodity Futures Trading Commission) regulatory compliance.

## Overview

These components handle:
- CFTC exemption requests
- Exemption status tracking
- Regulatory filing submissions
- Compliance reporting
- Regulatory data display

## Components

### Exemption Management
- `exemption-request-form.tsx` - Submit new exemption request
- `exemption-list.tsx` - List of exemptions (pending, approved, rejected)
- `exemption-detail.tsx` - Detailed exemption view
- `exemption-status-badge.tsx` - Visual status indicator
- `exemption-history.tsx` - Historical exemptions

### Filing Components
- `filing-form.tsx` - Regulatory filing submission
- `filing-list.tsx` - List of submitted filings
- `filing-status.tsx` - Filing status tracker

### Compliance
- `compliance-dashboard.tsx` - Compliance overview
- `compliance-checklist.tsx` - Regulatory requirements checklist
- `position-report.tsx` - Position reporting component
- `large-trader-report.tsx` - Large trader reporting

## Exemption Types

The application supports various CFTC exemption types:

```typescript
type ExemptionType =
  | 'hedge'              // Bona fide hedging exemption
  | 'spread'             // Spread exemption
  | 'risk_management'    // Risk management exemption
  | 'pass_through'       // Pass-through exemption
  | 'other';             // Other exemptions

type ExemptionStatus =
  | 'draft'              // Being prepared
  | 'pending'            // Submitted, awaiting review
  | 'under_review'       // CFTC reviewing
  | 'approved'           // Exemption granted
  | 'rejected'           // Exemption denied
  | 'expired';           // Exemption expired
```

## Usage Examples

### Exemption Request Form
```typescript
import { ExemptionRequestForm } from '@/components/cftc/exemption-request-form';

<ExemptionRequestForm
  onSubmit={handleSubmitExemption}
  initialData={{
    type: 'hedge',
    commodity: 'Natural Gas',
    exchange: 'NYMEX'
  }}
/>
```

### Exemption List
```typescript
import { ExemptionList } from '@/components/cftc/exemption-list';

<ExemptionList
  status="pending"
  onView={handleViewExemption}
  onEdit={handleEditExemption}
/>
```

### Exemption Status Badge
```typescript
import { ExemptionStatusBadge } from '@/components/cftc/exemption-status-badge';

<ExemptionStatusBadge status="approved" />
<ExemptionStatusBadge status="pending" />
<ExemptionStatusBadge status="rejected" />
```

## Regulatory Requirements

### Position Limits
Display position limit information:
```typescript
interface PositionLimit {
  commodity: string;
  exchange: string;
  spotMonth: number;
  allMonths: number;
  currentPosition: number;
  utilization: number; // Percentage
}

<PositionLimitDisplay
  limits={positionLimits}
  showAlerts={true}
/>
```

### Large Trader Reporting
Required when positions exceed thresholds:
```typescript
<LargeTraderReport
  positions={positions}
  reportingDate={new Date()}
  onSubmit={handleSubmitReport}
/>
```

## Form Structure

### Exemption Request Form Fields
```typescript
interface ExemptionRequestData {
  // Basic Information
  type: ExemptionType;
  commodity: string;
  exchange: string;
  contractMonth: string;

  // Position Details
  currentPosition: number;
  requestedLimit: number;
  justification: string;

  // Supporting Documentation
  hedgeDocumentation?: File[];
  riskAnalysis?: File[];

  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}
```

## Validation Rules

Exemption requests must meet CFTC requirements:

```typescript
const exemptionSchema = z.object({
  type: z.enum(['hedge', 'spread', 'risk_management', 'pass_through', 'other']),
  commodity: z.string().min(1, 'Commodity is required'),
  exchange: z.string().min(1, 'Exchange is required'),
  currentPosition: z.number().positive(),
  requestedLimit: z.number().positive(),
  justification: z.string().min(100, 'Justification must be detailed'),
  // ...additional fields
});
```

## Status Workflow

### Exemption Lifecycle
1. **Draft**: User preparing request
2. **Pending**: Submitted to CFTC
3. **Under Review**: CFTC reviewing documentation
4. **Approved**: Exemption granted (with expiration date)
5. **Rejected**: Request denied (with reason)
6. **Expired**: Previously approved exemption expired

### Status Transitions
```typescript
const validTransitions = {
  draft: ['pending', 'cancelled'],
  pending: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['expired'],
  rejected: [],
  expired: []
};
```

## Data Display

### Exemption Summary Card
```typescript
<ExemptionCard
  exemption={{
    id: 123,
    type: 'hedge',
    commodity: 'Crude Oil',
    status: 'approved',
    approvedLimit: 5000,
    expirationDate: '2025-12-31'
  }}
/>
```

### Compliance Dashboard
```typescript
<ComplianceDashboard
  data={{
    activeExemptions: 5,
    pendingRequests: 2,
    expiringThisMonth: 1,
    complianceScore: 98
  }}
/>
```

## Documentation Requirements

Exemptions require supporting documentation:
- Hedge documentation for hedging exemptions
- Risk management policies
- Position rationale
- Historical trading patterns
- Business need justification

```typescript
<DocumentUpload
  acceptedTypes={['.pdf', '.doc', '.docx']}
  maxSize={10 * 1024 * 1024} // 10MB
  onUpload={handleDocumentUpload}
/>
```

## Notifications

Alert users about exemption status changes:
```typescript
<ExemptionNotification
  type="expiring_soon"
  exemption={exemption}
  daysUntilExpiration={30}
/>

<ExemptionNotification
  type="status_change"
  exemption={exemption}
  newStatus="approved"
/>
```

## Reporting

Generate compliance reports:
```typescript
<ComplianceReport
  reportType="position_limits"
  period="monthly"
  format="pdf"
  onGenerate={handleGenerateReport}
/>
```

## Integration with Backend

CFTC components integrate with backend APIs:

```typescript
import { cftcApi } from '@/lib/api/cftc';

// Submit exemption request
const exemption = await cftcApi.exemptions.create(requestData);

// Get exemption status
const status = await cftcApi.exemptions.getStatus(exemptionId);

// Upload supporting documents
await cftcApi.exemptions.uploadDocuments(exemptionId, files);
```

## Best Practices

1. **Accuracy**: Ensure all data is accurate and complete
2. **Documentation**: Maintain thorough documentation
3. **Deadlines**: Track and alert on critical deadlines
4. **Audit Trail**: Log all changes and submissions
5. **Validation**: Validate all inputs before submission
6. **Security**: Protect sensitive regulatory data
7. **Compliance**: Stay up-to-date with CFTC regulations
8. **User Guidance**: Provide clear instructions and help text

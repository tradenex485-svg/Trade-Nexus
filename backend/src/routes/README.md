# API Routes

HTTP route handlers for all API endpoints.

## Route Organization

Each file contains routes for a specific domain or feature area:

### Authentication & Users
- `auth.ts` - Login, logout, token refresh
- `saml.ts` - SAML 2.0 SSO integration
- `oauth.ts` - OAuth 2.0 authentication
- `users.ts` - User management CRUD operations

### Trading Operations
- `transactions.ts` - Trade transaction management
- `pre-trade.ts` - Pre-trade checks and validation
- `pre-trade-validation.ts` - Enhanced pre-trade validation
- `trade-approvals.ts` - Trade approval workflows
- `bid-week.ts` - Bid week management

### Risk Management
- `position-limits.ts` - Position limit monitoring
- `market-limits.ts` - Market limit tracking
- `risk-thresholds.ts` - Risk threshold configuration
- `risk-scenarios.ts` - Risk scenario analysis
- `risk-metrics.ts` - Risk metric calculations

### Regulatory Compliance
- `exemptions.ts` - CFTC exemption management
- `regulatory-filings.ts` - Regulatory filing submissions
- `audit-logs.ts` - Audit log viewing
- `audit-trail.ts` - Detailed audit trails

### Data Management
- `data-import.ts` - Generic data import
- `csv-import.ts` - CSV file imports
- `mapping.ts` - Data mapping configuration
- `aggregation.ts` - Data aggregation operations
- `monthly-schedules.ts` - Monthly schedule management
- `data-quality.ts` - Data quality monitoring

### Reporting & Analytics
- `reports.ts` - Report generation
- `subset-reports.ts` - Subset report generation
- `dashboard.ts` - Dashboard data endpoints
- `monitoring.ts` - System monitoring

### Administration
- `companies.ts` - Company management
- `traders.ts` - Trader profile management
- `exchanges.ts` - Exchange configuration
- `api-keys.ts` - API key management
- `subscriptions.ts` - Subscription management

### System Features
- `alerts.ts` - Alert configuration and delivery
- `documents.ts` - Document storage and retrieval
- `security.ts` - Security settings
- `support.ts` - Support ticket management
- `approvals.ts` - Generic approval workflows
- `financial.ts` - Financial data and reporting
- `exceptions-handling.ts` - Exception tracking and resolution

### Testing
- `test-emails.ts` - Test email functionality (dev only)

## Route Structure

Each route file typically follows this pattern:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { MyService } from '../services/my-service';
import { mySchema } from '../schemas/my-schema';

export const myRoutes = new Hono()
  .get('/', auth, async (c) => {
    // List/index endpoint
  })
  .get('/:id', auth, async (c) => {
    // Show individual resource
  })
  .post('/', auth, zValidator('json', mySchema), async (c) => {
    // Create new resource
  })
  .put('/:id', auth, zValidator('json', mySchema), async (c) => {
    // Update existing resource
  })
  .delete('/:id', auth, async (c) => {
    // Delete resource
  });
```

## RESTful Conventions

Routes follow REST conventions:
- `GET /resources` - List all resources
- `GET /resources/:id` - Get single resource
- `POST /resources` - Create new resource
- `PUT /resources/:id` - Update resource
- `DELETE /resources/:id` - Delete resource

## Authentication

Most routes require authentication:
- Use `auth` middleware for protected endpoints
- Use `optionalAuth` for public endpoints that benefit from user context
- API key authentication for external integrations

## Validation

Input validation using Zod:
```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  email: z.string().email()
});

app.post('/users', zValidator('json', schema), async (c) => {
  const validated = c.req.valid('json');
  // Use validated data
});
```

## Error Responses

Standard error format:
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Best Practices

1. **Keep Routes Thin**: Delegate business logic to services
2. **Validate Inputs**: Use Zod schemas for all inputs
3. **Handle Errors**: Wrap async code in try-catch
4. **Return Consistent Formats**: Use standard response structures
5. **Document Endpoints**: Add comments for complex endpoints
6. **Use Middleware**: Apply auth, rate limiting appropriately

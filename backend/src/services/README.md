# Services

Business logic layer containing core application functionality.

## Purpose

Services encapsulate business logic and provide a clean separation between:
- HTTP route handlers (thin controllers)
- Business rules and workflows
- Database operations
- External API integrations
- Complex calculations

## Available Services

### Authentication & Security
- `auth-service.ts` - User authentication, JWT token generation
- `saml-service.ts` - SAML 2.0 SSO integration
- `oauth-service.ts` - OAuth 2.0 authentication flow
- `api-key-service.ts` - API key management and validation
- `security-logger.ts` - Security event logging
- `sso-provisioning-service.ts` - Single sign-on user provisioning

### Trading Operations
- `pre-trade-service.ts` - Pre-trade validation checks
- `pre-trade-validation-service.ts` - Enhanced validation rules
- `trade-approval-service.ts` - Trade approval workflows
- `bid-week-service.ts` - Bid week management
- `batch-service.ts` - Batch processing operations

### Risk Management
- `limit-calculator.ts` - Position and market limit calculations
- `risk-analytics.ts` - Risk metrics and analysis
- `realtime-monitoring.ts` - Real-time risk monitoring

### Data Management
- `data-validation-service.ts` - Data validation rules
- `data-quality-service.ts` - Data quality checks
- `aggregation-service.ts` - Data aggregation operations
- `cache-service.ts` - Caching layer for performance

### Compliance & Reporting
- `regulatory-compliance.ts` - Compliance rule enforcement
- `regulatory-reporting.ts` - Regulatory report generation
- `report-service.ts` - General report generation
- `subset-report-service.ts` - Subset report creation
- `audit-logger.ts` - Audit trail logging
- `audit-trail-service.ts` - Audit trail management

### Notifications & Alerts
- `email-service.ts` - Email sending functionality
- `alert-service.ts` - Alert generation and delivery
- `subscription-service.ts` - Subscription management

### System Services
- `document-service.ts` - Document storage and retrieval
- `exception-handling-service.ts` - Exception tracking
- `config-encryption-service.ts` - Configuration encryption

## Service Structure

Typical service module structure:

```typescript
import { Context } from 'hono';

export class MyService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async create(data: CreateData): Promise<Resource> {
    // Validation
    this.validateData(data);

    // Business logic
    const processed = this.processData(data);

    // Database operation
    const result = await this.db
      .prepare('INSERT INTO ...')
      .bind(...values)
      .run();

    return this.formatResponse(result);
  }

  async findById(id: number): Promise<Resource | null> {
    const result = await this.db
      .prepare('SELECT * FROM ... WHERE id = ?')
      .bind(id)
      .first();

    return result ? this.formatResponse(result) : null;
  }

  private validateData(data: any): void {
    // Validation logic
  }

  private processData(data: any): any {
    // Business logic
  }

  private formatResponse(data: any): Resource {
    // Response formatting
  }
}
```

## Usage in Routes

```typescript
import { MyService } from '../services/my-service';

app.post('/resources', auth, async (c) => {
  const db = c.env.DB;
  const service = new MyService(db);

  const data = await c.req.json();
  const result = await service.create(data);

  return c.json(result, 201);
});
```

## Design Principles

### Single Responsibility
Each service should have one clear purpose:
```typescript
// Good: Focused service
class UserService {
  createUser() { }
  updateUser() { }
  deleteUser() { }
}

// Bad: Too many responsibilities
class MegaService {
  createUser() { }
  sendEmail() { }
  calculateRisk() { }
}
```

### Dependency Injection
Services should receive dependencies as parameters:
```typescript
class MyService {
  constructor(
    private db: D1Database,
    private emailService: EmailService
  ) {}
}
```

### Testability
Services should be easily testable:
```typescript
// Service doesn't depend on HTTP context
class MyService {
  async calculateTotal(items: Item[]): Promise<number> {
    return items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Easy to test without mocking HTTP
test('calculates total', () => {
  const service = new MyService();
  const total = service.calculateTotal([
    { price: 10 },
    { price: 20 }
  ]);
  expect(total).toBe(30);
});
```

### Error Handling
Services should throw meaningful errors:
```typescript
class MyService {
  async findById(id: number): Promise<Resource> {
    const result = await this.db
      .prepare('SELECT * FROM resources WHERE id = ?')
      .bind(id)
      .first();

    if (!result) {
      throw new Error(`Resource ${id} not found`);
    }

    return result;
  }
}
```

## Best Practices

1. **Keep Pure**: Minimize side effects where possible
2. **Type Safety**: Use TypeScript types for parameters and returns
3. **Async/Await**: Use async/await for asynchronous operations
4. **Transaction Management**: Use database transactions for multi-step operations
5. **Logging**: Log important business events
6. **Validation**: Validate inputs at service level
7. **Documentation**: Document complex business logic
8. **Testing**: Write unit tests for service methods

## Transaction Example

```typescript
class OrderService {
  async createOrder(orderData: OrderData): Promise<Order> {
    // Use transaction for atomicity
    return await this.db.batch([
      this.db.prepare('INSERT INTO orders ...').bind(...orderValues),
      this.db.prepare('INSERT INTO order_items ...').bind(...itemValues),
      this.db.prepare('UPDATE inventory ...').bind(...inventoryValues)
    ]);
  }
}
```

## Integration Example

```typescript
class NotificationService {
  constructor(
    private emailService: EmailService,
    private alertService: AlertService
  ) {}

  async notifyUser(userId: number, message: string): Promise<void> {
    // Coordinate multiple services
    await Promise.all([
      this.emailService.send(userId, message),
      this.alertService.create(userId, message)
    ]);
  }
}
```

# Trade Nexus Backend

RESTful API server built with Hono framework running on Cloudflare Workers with D1 database.

## Architecture

```
backend/
├── src/
│   ├── config/           # Application configuration
│   ├── middleware/       # HTTP middleware (auth, rate limiting, etc.)
│   ├── routes/          # API route handlers
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Business logic layer
│   ├── utils/           # Helper functions and utilities
│   ├── index.ts         # Application entry point
│   └── scheduled.ts     # Scheduled/cron job handlers
├── migrations/          # D1 database migrations
├── migrations_backup/   # Backup of database migrations
├── test/               # Test files
├── wrangler.toml       # Cloudflare Workers configuration
└── package.json
```

## Tech Stack

- **Framework**: Hono v4.6+ (lightweight web framework)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-based)
- **Validation**: Zod v3.23+
- **Authentication**: JWT (jose library) + bcryptjs for password hashing
- **Testing**: Vitest with @cloudflare/vitest-pool-workers

## API Features

### Authentication & Authorization
- JWT-based authentication
- SAML 2.0 SSO integration
- OAuth 2.0 support
- API key management with rate limiting
- Role-based access control (RBAC)

### Trading Operations
- Pre-trade validation
- Trade approvals workflow
- Transaction management
- Position tracking
- Bid week management

### Risk Management
- Position limits monitoring
- Market limits tracking
- Risk metrics calculation
- Risk scenario analysis
- Risk threshold alerts

### Regulatory Compliance
- CFTC exemption management
- Regulatory filing submissions
- Audit trail logging
- Compliance reporting
- Data quality monitoring

### Data Management
- CSV data import
- Excel file processing (XLSX)
- Data aggregation
- Monthly schedules
- Subset reporting

### Administration
- User management
- Company management
- Trader profiles
- Exchange configuration
- Subscription management

## Development

### Environment Setup

```bash
# Install dependencies
npm install

# Generate TypeScript types from wrangler config
npm run cf-typegen

# Run local development server
npm run dev
```

### Database Migrations

```bash
# Apply migrations to local D1 database
npm run db:migrate

# Apply migrations to production
npm run db:migrate:prod

# Create a new D1 database
npm run db:create
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Run all validation (lint + type-check + test)
npm run validate
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## API Structure

### Middleware
- `auth.ts`: JWT authentication and authorization
- `rate-limiter.ts`: API rate limiting
- `api-key-rate-limiter.ts`: API key specific rate limiting
- `company-scoping.ts`: Multi-tenancy company scoping
- `error-tracking.ts`: Error logging and tracking
- `performance.ts`: Performance monitoring
- `security-headers.ts`: Security headers middleware

### Services
Business logic is separated into service modules:
- Authentication and SSO services
- Trading and approval services
- Risk calculation and monitoring services
- Regulatory compliance services
- Data import and aggregation services
- Email and notification services
- Audit logging services

### Routes
All API endpoints are organized by feature domain:
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/companies/*` - Company management
- `/api/traders/*` - Trader management
- `/api/transactions/*` - Trading operations
- `/api/position-limits/*` - Position limit management
- `/api/market-limits/*` - Market limit management
- `/api/exemptions/*` - CFTC exemptions
- `/api/alerts/*` - Alert management
- `/api/reports/*` - Reporting endpoints
- `/api/dashboard/*` - Dashboard data
- And many more...

## Configuration

Configuration is managed through `wrangler.toml` and environment variables:

- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- Database bindings for D1
- KV namespace bindings
- Scheduled job configurations

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- API key authentication
- Rate limiting per endpoint
- Security headers (CORS, CSP, etc.)
- Audit trail logging
- Company data isolation

## Scheduled Jobs

The `scheduled.ts` file contains cron jobs for:
- Data aggregation tasks
- Alert notifications
- Report generation
- Data cleanup
- Monitoring tasks

## API Documentation

API endpoints follow RESTful conventions:
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources
- `DELETE` - Remove resources

All requests/responses use JSON format with Zod schema validation.

## Error Handling

Standardized error responses with:
- HTTP status codes
- Error messages
- Error tracking and logging
- Stack traces in development mode

## Performance

- Edge computing with Cloudflare Workers
- Database connection pooling
- Performance monitoring middleware
- Response caching where appropriate

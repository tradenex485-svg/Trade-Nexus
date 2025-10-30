# Backend Source Code

Core source code for the Trade Nexus API server.

## Structure

### `index.ts`
Main application entry point that:
- Initializes Hono app with middleware
- Registers all route handlers
- Configures CORS, logging, and security
- Exports the Workers fetch handler

### `scheduled.ts`
Scheduled job handlers for cron-based tasks:
- Automated data aggregation
- Periodic alert checks
- Report generation
- Data maintenance tasks

## Subdirectories

### `config/`
Application configuration and constants:
- Environment-specific settings
- Feature flags
- API configuration
- Database connection settings

### `middleware/`
HTTP middleware functions:
- Authentication and authorization
- Rate limiting
- Company scoping for multi-tenancy
- Performance monitoring
- Error tracking
- Security headers

### `routes/`
API route handlers organized by domain:
- Each file exports routes for a specific feature area
- Routes handle HTTP requests and delegate to services
- Input validation using Zod schemas
- Response formatting

### `schemas/`
Zod validation schemas:
- Request body validation
- Query parameter validation
- Response structure definitions
- Data type definitions

### `services/`
Business logic layer:
- Core application logic
- Database operations
- External API integrations
- Complex calculations
- Email and notifications

### `utils/`
Helper functions and utilities:
- Date/time formatting
- Data transformation
- Common calculations
- Shared helper functions

## Development Guidelines

1. **Routes**: Keep route handlers thin - delegate to services
2. **Services**: Implement business logic and database operations
3. **Schemas**: Define and validate all inputs/outputs
4. **Middleware**: Apply cross-cutting concerns
5. **Utils**: Share common functionality

## Import Conventions

```typescript
// External dependencies
import { Hono } from 'hono';

// Middleware
import { auth } from './middleware/auth';

// Services
import { AuthService } from './services/auth-service';

// Schemas
import { userSchema } from './schemas/user-schema';

// Utils
import { formatDate } from './utils/date-utils';
```

## Error Handling

All routes should handle errors appropriately:
- Use try-catch blocks
- Return appropriate HTTP status codes
- Log errors for debugging
- Return user-friendly error messages

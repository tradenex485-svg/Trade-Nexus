# Middleware

HTTP middleware functions for request/response processing.

## Available Middleware

### `auth.ts`
JWT-based authentication middleware:
- Validates JWT tokens from Authorization header
- Extracts user information from token
- Enforces authentication requirements
- Provides optional authentication for public endpoints

### `api-key-rate-limiter.ts`
API key-specific rate limiting:
- Rate limits based on API key
- Configurable limits per key tier
- Protects against API abuse

### `rate-limiter.ts`
General rate limiting middleware:
- IP-based rate limiting
- Configurable rate limit presets
- Per-endpoint rate limiting
- Returns rate limit stats

### `company-scoping.ts`
Multi-tenancy company scoping:
- Isolates data by company
- Enforces company-level access control
- Extracts company context from requests
- Prevents cross-company data access

### `error-tracking.ts`
Error logging and tracking:
- Captures and logs errors
- Tracks error patterns
- Provides error context
- Integrates with monitoring services

### `performance.ts`
Performance monitoring:
- Measures request duration
- Tracks slow endpoints
- Provides performance statistics
- Helps identify bottlenecks

### `security-headers.ts`
Security header management:
- Sets CORS headers
- Configures CSP (Content Security Policy)
- Adds security-related headers
- Prevents common security vulnerabilities

## Usage

```typescript
import { Hono } from 'hono';
import { auth } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';

const app = new Hono();

// Apply middleware to routes
app.use('/api/*', performanceMonitoring);
app.use('/api/protected/*', auth);
app.use('/api/*', rateLimiter(RateLimitPresets.STANDARD));
```

## Middleware Order

Recommended middleware execution order:
1. Performance monitoring (start timer)
2. Security headers
3. Error tracking
4. Rate limiting
5. Authentication
6. Company scoping
7. Route handlers
8. Performance monitoring (end timer)

## Creating Custom Middleware

```typescript
import { Context, Next } from 'hono';

export const customMiddleware = async (c: Context, next: Next) => {
  // Pre-processing
  console.log('Before request');

  // Call next middleware/handler
  await next();

  // Post-processing
  console.log('After request');
};
```

## Best Practices

1. **Performance**: Keep middleware lightweight
2. **Order**: Apply middleware in the correct order
3. **Error Handling**: Handle errors gracefully
4. **Logging**: Log important events
5. **Testing**: Write tests for middleware logic

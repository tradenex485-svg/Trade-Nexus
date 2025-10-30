# Backend Tests

Test suite for the Trade Nexus backend API.

## Overview

This directory contains tests for:
- API route handlers
- Service layer logic
- Middleware functionality
- Utility functions
- Database operations

## Test Framework

- **Framework**: Vitest
- **Worker Environment**: @cloudflare/vitest-pool-workers
- **Assertions**: Vitest expect API

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- services/auth-service.test.ts
```

## Test Structure

Tests mirror the source code structure:

```
test/
├── services/
│   ├── auth-service.test.ts
│   ├── trade-service.test.ts
│   └── ...
├── middleware/
│   ├── auth.test.ts
│   └── rate-limiter.test.ts
├── routes/
│   ├── auth.test.ts
│   └── users.test.ts
└── utils/
    └── formatters.test.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should perform expected behavior', () => {
    // Arrange
    const input = { /* test data */ };

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Testing Services

```typescript
import { describe, it, expect } from 'vitest';
import { AuthService } from '../src/services/auth-service';

describe('AuthService', () => {
  it('should hash password correctly', async () => {
    const service = new AuthService(mockDb);
    const hashed = await service.hashPassword('password123');

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe('password123');
  });

  it('should validate password', async () => {
    const service = new AuthService(mockDb);
    const hashed = await service.hashPassword('password123');
    const isValid = await service.verifyPassword('password123', hashed);

    expect(isValid).toBe(true);
  });
});
```

### Testing Routes

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../src/routes/auth';

describe('Auth Routes', () => {
  const app = new Hono();
  app.route('/auth', authRoutes);

  it('POST /auth/login - should login user', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('token');
  });

  it('POST /auth/login - should reject invalid credentials', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });

    expect(res.status).toBe(401);
  });
});
```

### Testing Middleware

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { auth } from '../src/middleware/auth';

describe('Auth Middleware', () => {
  const app = new Hono();
  app.use('/protected/*', auth);
  app.get('/protected/data', (c) => c.json({ data: 'secret' }));

  it('should reject request without token', async () => {
    const res = await app.request('/protected/data');
    expect(res.status).toBe(401);
  });

  it('should allow request with valid token', async () => {
    const res = await app.request('/protected/data', {
      headers: {
        Authorization: 'Bearer valid-token-here'
      }
    });
    expect(res.status).toBe(200);
  });
});
```

### Mocking Database

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock D1 database
const mockDb = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      first: vi.fn(() => Promise.resolve({ id: 1, name: 'Test' })),
      all: vi.fn(() => Promise.resolve({ results: [] })),
      run: vi.fn(() => Promise.resolve({ success: true }))
    }))
  })),
  batch: vi.fn(() => Promise.resolve([]))
};

describe('Database Operations', () => {
  it('should query database', async () => {
    const result = await mockDb
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(1)
      .first();

    expect(result).toEqual({ id: 1, name: 'Test' });
  });
});
```

### Testing Async Functions

```typescript
describe('Async Operations', () => {
  it('should handle async operations', async () => {
    const promise = fetchData();
    await expect(promise).resolves.toBe('data');
  });

  it('should handle errors', async () => {
    const promise = fetchInvalidData();
    await expect(promise).rejects.toThrow('Error message');
  });
});
```

### Testing with Cloudflare Workers

```typescript
import { env, createExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Worker', () => {
  it('should respond to requests', async () => {
    const request = new Request('http://localhost/api/health');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
```

## Test Coverage

Aim for high test coverage:
- **Routes**: Test all endpoints and error cases
- **Services**: Test business logic and edge cases
- **Middleware**: Test authentication, authorization, rate limiting
- **Utils**: Test all utility functions

Check coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Best Practices

1. **Descriptive Names**: Use clear test descriptions
   ```typescript
   it('should reject login with invalid email format', () => {});
   ```

2. **Arrange-Act-Assert**: Follow AAA pattern
   ```typescript
   // Arrange
   const input = createTestData();
   // Act
   const result = functionUnderTest(input);
   // Assert
   expect(result).toBe(expected);
   ```

3. **One Assertion Per Test**: Focus each test on one behavior
   ```typescript
   // Good
   it('should return user name', () => {
     expect(user.name).toBe('John');
   });

   // Less ideal
   it('should return user data', () => {
     expect(user.name).toBe('John');
     expect(user.email).toBe('john@example.com');
     expect(user.age).toBe(30);
   });
   ```

4. **Test Edge Cases**: Don't just test happy paths
   ```typescript
   it('should handle empty array', () => {});
   it('should handle null values', () => {});
   it('should handle invalid input', () => {});
   ```

5. **Use Mocks Sparingly**: Prefer real implementations when possible

6. **Clean Up**: Reset state between tests
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

7. **Fast Tests**: Keep tests fast by minimizing I/O

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main/dev branches
- Pre-deployment validation

## Debugging Tests

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- auth-service.test.ts

# Update snapshots
npm test -- -u
```

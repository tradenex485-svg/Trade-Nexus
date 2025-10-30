# Cloudflare Pages Functions

Serverless functions that run on Cloudflare's edge network.

## Overview

Cloudflare Pages Functions provide serverless backend functionality:
- API endpoints
- Server-side logic
- Middleware
- Dynamic routes
- Edge computing

## Structure

```
functions/
├── api/              # API endpoints (/api/*)
│   └── hello.ts      # Example: /api/hello
├── admin/            # Admin endpoints (/admin/*)
│   └── companies/    # Nested routes
│       └── [id].ts   # Dynamic route: /admin/companies/:id
└── _middleware.ts    # Global middleware
```

## File-Based Routing

Functions use file-based routing similar to Next.js:

```
functions/api/users.ts           → /api/users
functions/api/users/[id].ts      → /api/users/:id
functions/api/[...path].ts       → /api/* (catch-all)
functions/_middleware.ts         → Runs before all functions
```

## Basic Function

```typescript
// functions/api/hello.ts
export const onRequest: PagesFunction = async (context) => {
  return new Response('Hello from Cloudflare Pages!');
};
```

## HTTP Methods

Handle different HTTP methods:

```typescript
// functions/api/users.ts
export const onRequestGet: PagesFunction = async (context) => {
  return Response.json({ users: [] });
};

export const onRequestPost: PagesFunction = async (context) => {
  const data = await context.request.json();
  return Response.json({ created: data }, { status: 201 });
};

export const onRequestPut: PagesFunction = async (context) => {
  const data = await context.request.json();
  return Response.json({ updated: data });
};

export const onRequestDelete: PagesFunction = async (context) => {
  return new Response(null, { status: 204 });
};
```

## Context Object

The function receives a context object:

```typescript
interface Context {
  request: Request;           // Incoming request
  env: Env;                  // Environment variables and bindings
  params: Record<string, string>; // Dynamic route parameters
  data: Record<string, any>; // Data passed from middleware
  next: () => Promise<Response>; // Call next middleware/function
  waitUntil: (promise: Promise<any>) => void; // Background tasks
}
```

## Dynamic Routes

### Path Parameters
```typescript
// functions/api/users/[id].ts
export const onRequestGet: PagesFunction = async (context) => {
  const { id } = context.params;
  return Response.json({ userId: id });
};

// Request: GET /api/users/123
// Response: { "userId": "123" }
```

### Catch-All Routes
```typescript
// functions/api/[...path].ts
export const onRequestGet: PagesFunction = async (context) => {
  const path = context.params.path; // Array of path segments
  return Response.json({ path });
};

// Request: GET /api/foo/bar/baz
// Response: { "path": ["foo", "bar", "baz"] }
```

## Middleware

### Global Middleware
```typescript
// functions/_middleware.ts
export const onRequest: PagesFunction = async (context) => {
  // Add CORS headers
  const response = await context.next();

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

  return response;
};
```

### Path-Specific Middleware
```typescript
// functions/admin/_middleware.ts
export const onRequest: PagesFunction = async (context) => {
  // Protect admin routes
  const token = context.request.headers.get('Authorization');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Continue to next handler
  return context.next();
};
```

## Database Access

Access D1 database through bindings:

```typescript
// functions/api/users.ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB
    .prepare('SELECT * FROM users')
    .all();

  return Response.json({ users: results });
};
```

## Environment Variables

Access environment variables:

```typescript
interface Env {
  API_KEY: string;
  DB: D1Database;
  MY_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.API_KEY;
  return Response.json({ apiKey });
};
```

## Error Handling

```typescript
export const onRequest: PagesFunction = async (context) => {
  try {
    // Your logic here
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
```

## Response Helpers

```typescript
// JSON response
return Response.json({ data: 'value' });

// With status code
return Response.json({ error: 'Not found' }, { status: 404 });

// Redirect
return Response.redirect('https://example.com', 302);

// HTML response
return new Response('<h1>Hello</h1>', {
  headers: { 'Content-Type': 'text/html' }
});

// No content
return new Response(null, { status: 204 });
```

## Request Body

```typescript
export const onRequestPost: PagesFunction = async (context) => {
  // JSON body
  const json = await context.request.json();

  // Form data
  const formData = await context.request.formData();
  const name = formData.get('name');

  // Text body
  const text = await context.request.text();

  // Binary body
  const buffer = await context.request.arrayBuffer();

  return Response.json({ received: json });
};
```

## Query Parameters

```typescript
export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '10';

  return Response.json({ page, limit });
};

// Request: GET /api/data?page=2&limit=20
```

## Headers

```typescript
export const onRequest: PagesFunction = async (context) => {
  // Read headers
  const auth = context.request.headers.get('Authorization');
  const contentType = context.request.headers.get('Content-Type');

  // Set headers
  return Response.json({ data: 'value' }, {
    headers: {
      'Cache-Control': 'max-age=3600',
      'X-Custom-Header': 'value'
    }
  });
};
```

## Authentication Example

```typescript
// functions/api/_middleware.ts
export const onRequest: PagesFunction = async (context) => {
  const publicPaths = ['/api/auth/login', '/api/health'];
  const { pathname } = new URL(context.request.url);

  if (publicPaths.includes(pathname)) {
    return context.next();
  }

  const token = context.request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify token
    const user = await verifyToken(token);
    context.data.user = user;
    return context.next();
  } catch (error) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }
};
```

## CORS Handling

```typescript
// functions/_middleware.ts
export const onRequest: PagesFunction = async (context) => {
  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const response = await context.next();

  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', '*');

  return response;
};
```

## Caching

```typescript
export const onRequestGet: PagesFunction = async (context) => {
  return Response.json({ data: 'cached' }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'CDN-Cache-Control': 'max-age=86400'
    }
  });
};
```

## Background Tasks

```typescript
export const onRequest: PagesFunction = async (context) => {
  // Start background task
  context.waitUntil(
    sendEmailNotification(user.email)
  );

  // Return immediately
  return Response.json({ queued: true });
};
```

## Best Practices

1. **Keep Functions Small**: Each function should do one thing
2. **Error Handling**: Always handle errors gracefully
3. **Type Safety**: Use TypeScript interfaces for context
4. **Performance**: Minimize cold start time
5. **Security**: Validate inputs, sanitize outputs
6. **Caching**: Use appropriate cache headers
7. **Environment Variables**: Store secrets in env vars
8. **Middleware**: Use middleware for cross-cutting concerns
9. **Testing**: Test functions locally before deployment
10. **Logging**: Use console.log for debugging (appears in dashboard)

## Local Development

Functions don't run in local Next.js dev server. For local testing:
1. Build the Next.js app
2. Use `wrangler pages dev` to test functions locally

```bash
npm run pages:build
wrangler pages dev .vercel/output/static
```

## Limitations

- Maximum execution time: 30 seconds (Enterprise: unlimited)
- Maximum request body size: 100 MB
- Cold start time: Typically <1ms
- Functions run on V8 isolates (not Node.js)

## When to Use Functions

✅ Use Cloudflare Pages Functions for:
- API endpoints
- Authentication
- Server-side data fetching
- Dynamic routes
- Middleware

❌ Don't use for:
- Long-running processes (use Workers)
- Complex backend logic (use dedicated backend)
- Heavy computations
- File uploads (use R2 directly)

## Deployment

Functions are automatically deployed with your Pages project:
```bash
npm run deploy
```

Functions will be available at the same domain as your Pages site.

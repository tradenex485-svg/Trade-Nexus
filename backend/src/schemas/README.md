# Validation Schemas

Zod schemas for request/response validation.

## Purpose

This directory contains Zod schemas used throughout the application for:
- Request body validation
- Query parameter validation
- Response data validation
- Type inference
- Runtime type checking
- API contract enforcement

## Schema Types

### Request Schemas
Validate incoming data:
```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['admin', 'trader', 'viewer'])
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
```

### Response Schemas
Define response structures:
```typescript
export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  createdAt: z.string()
});

export type UserResponse = z.infer<typeof userResponseSchema>;
```

### Query Parameter Schemas
Validate URL query parameters:
```typescript
export const listQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional()
});
```

## Usage in Routes

```typescript
import { zValidator } from '@hono/zod-validator';
import { createUserSchema } from '../schemas/user-schema';

app.post('/users',
  zValidator('json', createUserSchema),
  async (c) => {
    const data = c.req.valid('json'); // Type-safe validated data
    // Process request
  }
);
```

## Schema Composition

Reuse schemas using composition:
```typescript
const baseSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const userSchema = baseSchema.extend({
  email: z.string().email(),
  name: z.string()
});

const companySchema = baseSchema.extend({
  name: z.string(),
  taxId: z.string()
});
```

## Common Patterns

### Optional Fields
```typescript
z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  withDefault: z.string().default('default value')
})
```

### Enums
```typescript
z.enum(['option1', 'option2', 'option3'])
```

### Arrays
```typescript
z.array(z.string())
z.array(userSchema).min(1).max(100)
```

### Unions
```typescript
z.union([z.string(), z.number()])
```

### Transformations
```typescript
z.string().transform(val => val.toLowerCase())
z.string().regex(/^\d+$/).transform(Number)
```

### Custom Validation
```typescript
z.string().refine(
  val => val.length > 0,
  { message: "String cannot be empty" }
)
```

## Benefits

1. **Type Safety**: Automatic TypeScript type inference
2. **Runtime Validation**: Catch invalid data at runtime
3. **Self-Documenting**: Schemas serve as API documentation
4. **Error Messages**: Detailed validation error messages
5. **Consistency**: Ensures data format consistency
6. **Refactoring**: Safe refactoring with type checking

## Best Practices

1. **Colocate**: Keep related schemas together
2. **Reuse**: Compose schemas to avoid duplication
3. **Name Clearly**: Use descriptive schema names
4. **Export Types**: Export inferred TypeScript types
5. **Document**: Add comments for complex validations
6. **Test**: Write tests for custom validation logic

## Example Schema File

```typescript
import { z } from 'zod';

// Base schemas
const idSchema = z.number().int().positive();
const timestampSchema = z.string().datetime();

// Request schemas
export const createTradeSchema = z.object({
  traderId: idSchema,
  instrument: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  side: z.enum(['buy', 'sell'])
});

export const updateTradeSchema = createTradeSchema.partial();

// Response schemas
export const tradeResponseSchema = createTradeSchema.extend({
  id: idSchema,
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Type exports
export type CreateTradeRequest = z.infer<typeof createTradeSchema>;
export type UpdateTradeRequest = z.infer<typeof updateTradeSchema>;
export type TradeResponse = z.infer<typeof tradeResponseSchema>;
```

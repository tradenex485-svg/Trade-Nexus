# TypeScript Types

Type definitions for the Trade Nexus application.

## Purpose

This directory contains TypeScript type definitions for:
- API request/response types
- Domain models
- Component props
- Utility types
- Enums and constants

## Structure

```
types/
├── index.ts          # Export all types
├── user.ts          # User-related types
├── trade.ts         # Trading types
├── company.ts       # Company types
├── api.ts           # API types
└── common.ts        # Common/shared types
```

## Type Categories

### Domain Models
Core business entities:
```typescript
// types/user.ts
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  Admin = 'admin',
  Trader = 'trader',
  Viewer = 'viewer'
}

export type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserRequest = Partial<CreateUserRequest>;
```

### API Types
Request and response types:
```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Component Props
Reusable prop types:
```typescript
// types/components.ts
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface DataTableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}
```

### Common Types
Shared utility types:
```typescript
// types/common.ts
export type ID = number | string;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Status = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface WithId {
  id: number;
}
```

## Advanced Type Patterns

### Discriminated Unions
```typescript
type SuccessResponse = {
  status: 'success';
  data: any;
};

type ErrorResponse = {
  status: 'error';
  error: string;
};

export type ApiResult = SuccessResponse | ErrorResponse;

// Type guards
export function isSuccess(result: ApiResult): result is SuccessResponse {
  return result.status === 'success';
}
```

### Generic Types
```typescript
export interface Repository<T> {
  find(id: number): Promise<T>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

// Usage
type UserRepository = Repository<User>;
type CompanyRepository = Repository<Company>;
```

### Mapped Types
```typescript
// Make all properties optional
export type PartialUser = Partial<User>;

// Make all properties required
export type RequiredUser = Required<User>;

// Make all properties readonly
export type ReadonlyUser = Readonly<User>;

// Pick specific properties
export type UserCredentials = Pick<User, 'email' | 'password'>;

// Omit specific properties
export type UserWithoutPassword = Omit<User, 'password'>;

// Create a type with specific properties
export type UserProfile = {
  [K in 'firstName' | 'lastName' | 'email']: User[K];
};
```

### Conditional Types
```typescript
type IsString<T> = T extends string ? true : false;

type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

// Extract string properties from User
type UserStringFields = StringKeys<User>; // 'email' | 'firstName' | 'lastName'
```

### Template Literal Types
```typescript
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

type ApiEndpoint = 'users' | 'companies' | 'trades';
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiRoute = `/${ApiEndpoint}/${ApiMethod}`; // '/users/GET' | '/companies/POST' | etc.
```

## Type Utilities

### Type Guards
```typescript
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

export function hasId(value: unknown): value is WithId {
  return typeof value === 'object' && value !== null && 'id' in value;
}
```

### Type Assertions
```typescript
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}
```

## Extending External Types

### Extending Next.js Types
```typescript
// types/next.ts
import { NextPage } from 'next';
import { AppProps } from 'next/app';

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

export type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};
```

### Extending React Types
```typescript
import { ComponentPropsWithoutRef, ElementType } from 'react';

export type PolymorphicComponentProps<E extends ElementType> =
  ComponentPropsWithoutRef<E> & {
    as?: E;
  };
```

## Enum vs Union Types

### Enums
```typescript
export enum UserRole {
  Admin = 'admin',
  Trader = 'trader',
  Viewer = 'viewer'
}

// Usage
const role: UserRole = UserRole.Admin;
```

### Union Types (Preferred)
```typescript
export type UserRole = 'admin' | 'trader' | 'viewer';

// With const assertion
export const USER_ROLES = ['admin', 'trader', 'viewer'] as const;
export type UserRole = typeof USER_ROLES[number];
```

## Type Organization

### Index File
Export all types from a central location:
```typescript
// types/index.ts
export * from './user';
export * from './company';
export * from './trade';
export * from './api';
export * from './common';

// Or selective exports
export type { User, CreateUserRequest, UpdateUserRequest } from './user';
export type { Company } from './company';
```

## Best Practices

1. **Explicit Over Implicit**: Define types explicitly rather than relying on inference
2. **Reusability**: Create reusable utility types
3. **Naming**: Use clear, descriptive names (PascalCase for types)
4. **Documentation**: Add JSDoc comments for complex types
5. **Strict Mode**: Enable strict TypeScript settings
6. **Type Guards**: Use type guards for runtime type checking
7. **Avoid Any**: Never use `any`, use `unknown` instead
8. **Union Types**: Prefer union types over enums
9. **Const Assertions**: Use `as const` for literal types
10. **Generics**: Use generics for reusable, type-safe code

## JSDoc Comments

```typescript
/**
 * Represents a user in the system
 */
export interface User {
  /** Unique identifier */
  id: number;

  /** User's email address (must be unique) */
  email: string;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /**
   * User's role in the system
   * @see UserRole
   */
  role: UserRole;
}
```

## Zod Integration

For runtime validation with type inference:
```typescript
import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['admin', 'trader', 'viewer'])
});

// Infer TypeScript type from Zod schema
export type User = z.infer<typeof userSchema>;
```

## Testing with Types

```typescript
import { expectTypeOf } from 'vitest';

test('User type structure', () => {
  expectTypeOf<User>().toHaveProperty('id');
  expectTypeOf<User>().toHaveProperty('email');
  expectTypeOf<User['role']>().toEqualTypeOf<UserRole>();
});
```

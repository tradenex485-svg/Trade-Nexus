# Library & Utilities

Utility functions, API clients, and helper libraries.

## Structure

```
lib/
├── api/           # API client functions
├── hooks/         # Library-specific hooks (if any)
├── utils.ts       # General utility functions
└── constants.ts   # Application constants
```

## Common Files

### `utils.ts`
General utility functions used throughout the app:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes properly
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

// Format date
export function formatDate(date: Date | string, format?: string): string {
  return new Intl.DateTimeFormat('en-US').format(new Date(date));
}

// Capitalize string
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Truncate text
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
```

### `constants.ts`
Application-wide constants:

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile'
} as const;

export const ROLE_LABELS = {
  admin: 'Administrator',
  trader: 'Trader',
  viewer: 'Viewer'
} as const;

export const STATUS_COLORS = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red'
} as const;

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
```

## API Client (`lib/api/`)

Organized API client functions for backend communication.

### Structure
```
api/
├── client.ts       # Base API client
├── auth.ts         # Authentication endpoints
├── users.ts        # User endpoints
├── trades.ts       # Trading endpoints
├── reports.ts      # Reporting endpoints
└── ...
```

### Base Client (`client.ts`)
```typescript
import { API_BASE_URL } from '../constants';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

### Authentication API (`auth.ts`)
```typescript
import { apiClient } from './client';
import type { User, LoginRequest, LoginResponse } from '@/types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/api/auth/login', credentials);
  },

  logout: async (): Promise<void> => {
    return apiClient.post('/api/auth/logout');
  },

  refresh: async (): Promise<LoginResponse> => {
    return apiClient.post('/api/auth/refresh');
  },

  me: async (): Promise<User> => {
    return apiClient.get('/api/auth/me');
  }
};
```

### Resource API Pattern (`users.ts`)
```typescript
import { apiClient } from './client';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types';

export const usersApi = {
  list: async (): Promise<User[]> => {
    return apiClient.get('/api/users');
  },

  get: async (id: number): Promise<User> => {
    return apiClient.get(`/api/users/${id}`);
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    return apiClient.post('/api/users', data);
  },

  update: async (id: number, data: UpdateUserRequest): Promise<User> => {
    return apiClient.put(`/api/users/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/users/${id}`);
  }
};
```

## React Query Integration

Use with TanStack Query for data fetching:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';

// Fetch users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list
  });
}

// Fetch single user
export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id)
  });
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}
```

## Utility Categories

### Date & Time
```typescript
export function formatDate(date: Date): string { }
export function formatDateTime(date: Date): string { }
export function parseDate(str: string): Date { }
export function isToday(date: Date): boolean { }
export function daysAgo(date: Date): number { }
```

### Numbers
```typescript
export function formatNumber(num: number): string { }
export function formatCurrency(amount: number): string { }
export function formatPercentage(value: number): string { }
export function round(value: number, decimals: number): number { }
```

### Strings
```typescript
export function capitalize(str: string): string { }
export function truncate(str: string, length: number): string { }
export function slugify(str: string): string { }
export function initials(name: string): string { }
```

### Arrays
```typescript
export function chunk<T>(array: T[], size: number): T[][] { }
export function unique<T>(array: T[]): T[] { }
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> { }
export function sortBy<T>(array: T[], key: keyof T): T[] { }
```

### Validation
```typescript
export function isEmail(str: string): boolean { }
export function isUrl(str: string): boolean { }
export function isPhone(str: string): boolean { }
export function isEmpty(value: any): boolean { }
```

### Objects
```typescript
export function pick<T>(obj: T, keys: (keyof T)[]): Partial<T> { }
export function omit<T>(obj: T, keys: (keyof T)[]): Partial<T> { }
export function deepClone<T>(obj: T): T { }
export function isEqual(a: any, b: any): boolean { }
```

### Type Guards
```typescript
export function isDefined<T>(value: T | null | undefined): value is T { }
export function isString(value: unknown): value is string { }
export function isNumber(value: unknown): value is number { }
export function isArray(value: unknown): value is any[] { }
```

## Best Practices

1. **Pure Functions**: Make utilities pure when possible
2. **Type Safety**: Use TypeScript generics and overloads
3. **Single Purpose**: Each function should do one thing
4. **Naming**: Use clear, descriptive names
5. **Documentation**: Add JSDoc comments
6. **Testing**: Write unit tests for all utilities
7. **Performance**: Optimize frequently used functions
8. **Tree Shaking**: Export functions individually for better tree-shaking

## Error Handling

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
```

## Usage in Components

```typescript
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { usersApi } from '@/lib/api/users';

export function UserCard({ user }) {
  return (
    <div className={cn('card', 'p-4', user.isActive && 'border-green-500')}>
      <h3>{user.name}</h3>
      <p>Joined: {formatDate(user.createdAt)}</p>
      <p>Balance: {formatCurrency(user.balance)}</p>
    </div>
  );
}
```

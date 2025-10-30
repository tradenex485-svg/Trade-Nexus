# Utilities

Helper functions and utility modules used across the application.

## Purpose

This directory contains reusable utility functions for:
- Data transformation and formatting
- Common calculations
- Date/time operations
- String manipulation
- Validation helpers
- Type guards
- Constants and enums

## Common Utility Types

### Date/Time Utilities
```typescript
// Format dates
export function formatDate(date: Date, format: string): string {
  // Implementation
}

// Parse dates
export function parseDate(dateString: string): Date {
  // Implementation
}

// Calculate date ranges
export function getDateRange(start: Date, end: Date): Date[] {
  // Implementation
}
```

### String Utilities
```typescript
// Capitalize strings
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Slugify strings
export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// Truncate text
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
```

### Number Utilities
```typescript
// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

// Round to decimal places
export function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Calculate percentage
export function percentage(value: number, total: number): number {
  return (value / total) * 100;
}
```

### Array Utilities
```typescript
// Chunk array
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Remove duplicates
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// Group by property
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const group = String(item[key]);
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
```

### Object Utilities
```typescript
// Deep clone
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Pick properties
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Omit properties
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}
```

### Type Guards
```typescript
// Check if value is defined
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

// Check if string is email
export function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

// Check if value is number
export function isNumeric(value: any): value is number {
  return !isNaN(parseFloat(value)) && isFinite(value);
}
```

### Validation Helpers
```typescript
// Validate required fields
export function validateRequired(obj: any, fields: string[]): string[] {
  const missing: string[] = [];
  fields.forEach(field => {
    if (!obj[field]) {
      missing.push(field);
    }
  });
  return missing;
}

// Validate email format
export function validateEmail(email: string): boolean {
  return isEmail(email);
}

// Validate phone number
export function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\-()]+$/.test(phone);
}
```

### Async Utilities
```typescript
// Delay execution
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(delayMs * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

// Timeout promise
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}
```

### Error Utilities
```typescript
// Create error with details
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Safe error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}
```

## Usage Examples

```typescript
import { formatDate, formatCurrency, chunk, retry } from '../utils';

// Format date
const formatted = formatDate(new Date(), 'YYYY-MM-DD');

// Format currency
const price = formatCurrency(1234.56);

// Chunk array for batch processing
const users = await db.query('SELECT * FROM users');
const batches = chunk(users, 100);
for (const batch of batches) {
  await processBatch(batch);
}

// Retry failed operations
const result = await retry(
  () => fetchExternalAPI(),
  3,  // max retries
  1000 // initial delay
);
```

## Organization

Utilities can be organized into separate files by category:
- `date-utils.ts` - Date/time helpers
- `string-utils.ts` - String manipulation
- `number-utils.ts` - Number formatting and calculations
- `array-utils.ts` - Array operations
- `validation-utils.ts` - Validation helpers
- `error-utils.ts` - Error handling
- `constants.ts` - Application constants

## Best Practices

1. **Pure Functions**: Make utilities pure when possible (no side effects)
2. **Type Safety**: Use TypeScript generics for reusable utilities
3. **Document**: Add JSDoc comments for complex functions
4. **Test**: Write unit tests for all utilities
5. **Performance**: Optimize frequently used utilities
6. **Naming**: Use clear, descriptive function names
7. **Single Purpose**: Each function should do one thing well

## Testing Utilities

```typescript
// utils.test.ts
import { describe, it, expect } from 'vitest';
import { chunk, formatCurrency } from './utils';

describe('chunk', () => {
  it('splits array into chunks', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('formatCurrency', () => {
  it('formats USD currency', () => {
    const result = formatCurrency(1234.56);
    expect(result).toBe('$1,234.56');
  });
});
```

# Frontend Source Code

Core source code for the Trade Nexus web application.

## Directory Structure

### `app/`
Next.js 15 App Router pages and layouts:
- File-based routing
- Server and client components
- Route groups for organization
- API routes (if any)
- Loading and error states

### `components/`
Reusable React components:
- Feature-specific components
- UI primitives
- Layout components
- Shared widgets

### `hooks/`
Custom React hooks:
- Business logic hooks
- UI state hooks
- API integration hooks
- Utility hooks

### `lib/`
Utilities and libraries:
- API client
- Helper functions
- Constants
- Configuration

### `store/`
State management with Zustand:
- Global application state
- User session state
- UI preferences
- Cached data

### `styles/`
Global styles:
- Tailwind CSS base styles
- CSS reset/normalize
- Global CSS classes
- Font imports

### `test/`
Testing utilities:
- Test helpers
- Mock data
- Setup files
- Custom matchers

### `types/`
TypeScript type definitions:
- API response types
- Domain models
- Component prop types
- Utility types

### `stories/`
Storybook stories:
- Component documentation
- Visual testing
- Usage examples

## Import Aliases

The project uses TypeScript path aliases:

```typescript
// Instead of: import { Button } from '../../../components/ui/button'
import { Button } from '@/components/ui/button'

// Configured in tsconfig.json:
// "@/*": ["./src/*"]
```

## Component Architecture

### Server Components (Default)
Located in `app/` directory:
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchData(); // Server-side data fetching
  return <Dashboard data={data} />;
}
```

### Client Components
Marked with `'use client'` directive:
```typescript
// components/ui/button.tsx
'use client'

import { useState } from 'react';

export function Button() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Styling Approach

### Tailwind CSS (Primary)
```typescript
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

### CSS Variables (Theming)
```typescript
// Uses CSS variables defined in styles/globals.css
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

### Class Variance Authority (Component Variants)
```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva('button-base', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      outline: 'border border-primary'
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg'
    }
  }
});
```

## Code Organization Best Practices

### 1. Colocate Related Code
```
app/dashboard/
├── page.tsx          # Main page component
├── layout.tsx        # Layout for dashboard section
├── loading.tsx       # Loading state
├── error.tsx         # Error boundary
└── components/       # Dashboard-specific components
    ├── widget.tsx
    └── chart.tsx
```

### 2. Separate Server and Client Logic
```typescript
// Server Component
import { ClientButton } from './client-button';

export default async function Page() {
  const data = await fetchServerData();
  return (
    <div>
      <h1>{data.title}</h1>
      <ClientButton />
    </div>
  );
}
```

### 3. Use Proper TypeScript Types
```typescript
// types/user.ts
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'trader' | 'viewer';
}

// components/user-card.tsx
import { User } from '@/types/user';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
}
```

### 4. Custom Hooks for Reusable Logic
```typescript
// hooks/use-auth.ts
export function useAuth() {
  const user = useAuthStore(state => state.user);
  const login = useAuthStore(state => state.login);
  const logout = useAuthStore(state => state.logout);

  return { user, login, logout, isAuthenticated: !!user };
}

// Usage in component
const { user, logout } = useAuth();
```

### 5. API Client Organization
```typescript
// lib/api/users.ts
export const userApi = {
  list: () => fetch('/api/users').then(r => r.json()),
  get: (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
  create: (data: CreateUserData) =>
    fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(r => r.json())
};
```

## Error Handling

### Error Boundaries
```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Loading States
```typescript
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}
```

## Performance Considerations

### 1. Dynamic Imports
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <p>Loading...</p>
});
```

### 2. Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority
/>
```

### 3. Memo and Callbacks
```typescript
import { memo, useCallback, useMemo } from 'react';

export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  const processedData = useMemo(() => processData(data), [data]);
  const handleClick = useCallback(() => doSomething(), []);

  return <div onClick={handleClick}>{processedData}</div>;
});
```

## Development Guidelines

1. **Server First**: Use Server Components by default, only use Client Components when needed
2. **Type Safety**: Always define TypeScript types for props and data
3. **Accessibility**: Use semantic HTML and ARIA attributes
4. **Responsive**: Design mobile-first, test all breakpoints
5. **Performance**: Lazy load when appropriate, optimize images
6. **Testing**: Write tests for complex logic and critical paths
7. **Documentation**: Add JSDoc comments for complex components

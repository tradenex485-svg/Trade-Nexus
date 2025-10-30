# Application Pages

Next.js App Router pages and routes for the Trade Nexus application.

## Structure

The `app/` directory uses Next.js 15 App Router with file-based routing:

```
app/
├── (auth)/              # Authentication route group (no auth layout)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── auth/callback/   # OAuth/SAML callback
├── layout.tsx           # Root layout (applies to all pages)
├── page.tsx            # Home/Dashboard page
├── error.tsx           # Global error boundary
├── global-error.tsx    # Error boundary for root layout
└── [feature]/          # Feature-specific pages
    ├── page.tsx        # Feature page
    ├── layout.tsx      # Feature layout (optional)
    ├── loading.tsx     # Loading state
    └── error.tsx       # Error boundary
```

## Route Groups

### `(auth)/` - Authentication Routes
Routes without the main application layout:
- `/login` - User login page
- `/register` - New user registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset with token
- `/auth/callback` - OAuth/SAML callback handler

These routes use a minimal layout without sidebar/navigation.

## Main Application Routes

### Administration
- `/admin/companies` - Company management and CRUD operations
- `/admin/companies/[id]` - Individual company details
- `/admin/traders` - Trader profile management
- `/admin/exchanges` - Exchange configuration

### Trading & Operations
- `/pre-trade` - Pre-trade validation interface
- `/aggregation` - Data aggregation tools
- `/limits` - Position and market limits management

### Risk Management
- `/risk` - Risk management dashboard
- `/monitoring` - Real-time monitoring
- `/performance` - Performance analytics

### Regulatory Compliance
- `/exemptions/request` - Request new CFTC exemption
- `/exemptions/pending` - View pending exemptions
- `/exemptions/history` - Historical exemptions
- `/filings` - Regulatory filing submissions
- `/data-quality` - Data quality monitoring

### Reporting
- `/reports` - Report generation and viewing
- `/financial` - Financial data and reports
- `/calendar` - Event calendar and scheduling

### System Features
- `/alerts` - Alert configuration and management
- `/documents` - Document storage and retrieval
- `/api-keys` - API key management
- `/api-docs` - API documentation (Swagger UI)
- `/security` - Security settings
- `/settings` - Application settings
- `/profile` - User profile management
- `/subscriptions` - Subscription management
- `/support` - Support ticket system
- `/approvals` - Generic approval workflows
- `/workflow-approvals` - Workflow-specific approvals

## Special Files

### `layout.tsx`
Defines the layout for a route segment:
```typescript
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### `page.tsx`
The actual page component:
```typescript
export default function Page() {
  return <div>Page content</div>;
}
```

### `loading.tsx`
Shown while page is loading:
```typescript
export default function Loading() {
  return <Spinner />;
}
```

### `error.tsx`
Error boundary for the route:
```typescript
'use client'

export default function Error({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Error: {error.message}</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Page Components

### Server Components (Default)
Can fetch data directly:
```typescript
// app/dashboard/page.tsx
import { fetchDashboardData } from '@/lib/api';

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardWidgets data={data} />
    </div>
  );
}
```

### Client Components
For interactive features:
```typescript
// app/profile/page.tsx
'use client'

import { useState } from 'react';

export default function ProfilePage() {
  const [name, setName] = useState('');

  return (
    <form>
      <input value={name} onChange={e => setName(e.target.value)} />
    </form>
  );
}
```

## Route Metadata

Define metadata for SEO:
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Trade Nexus',
  description: 'Trading platform dashboard'
};

export default function Page() {
  return <div>Dashboard</div>;
}
```

## Dynamic Routes

Use brackets for dynamic segments:
```typescript
// app/admin/companies/[id]/page.tsx
export default function CompanyPage({
  params
}: {
  params: { id: string }
}) {
  return <div>Company ID: {params.id}</div>;
}
```

## Route Handlers (API Routes)

Create API endpoints in app router:
```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await fetchUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const data = await request.json();
  const user = await createUser(data);
  return NextResponse.json(user, { status: 201 });
}
```

## Parallel Routes

Load multiple pages in the same layout:
```typescript
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <>
      {children}
      {analytics}
      {team}
    </>
  );
}
```

## Intercepting Routes

Intercept and modify routes:
```typescript
// app/photos/(..)photo/[id]/page.tsx
// Intercepts /photo/[id] when navigating from /photos
```

## Best Practices

1. **Server Components First**: Use server components by default
2. **Colocate Components**: Keep page-specific components near the page
3. **Error Boundaries**: Add error.tsx for better error handling
4. **Loading States**: Add loading.tsx for better UX
5. **Metadata**: Define metadata for SEO
6. **Type Safety**: Use TypeScript for params and props
7. **Data Fetching**: Fetch data in server components when possible
8. **Route Groups**: Use route groups to organize without affecting URL structure

## Navigation

### Link Component
```typescript
import Link from 'next/link';

<Link href="/dashboard">Dashboard</Link>
```

### useRouter Hook
```typescript
'use client'

import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();

  return (
    <button onClick={() => router.push('/dashboard')}>
      Go to Dashboard
    </button>
  );
}
```

### Programmatic Navigation
```typescript
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return <div>Protected content</div>;
}
```

## Authentication

Protect routes with middleware or in the page:
```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <div>Protected dashboard</div>;
}
```

## Performance

1. **Static Generation**: Pages are statically generated by default
2. **Incremental Static Regeneration**: Use `revalidate` for periodic updates
3. **Streaming**: Use Suspense for progressive rendering
4. **Caching**: Leverage Next.js automatic caching

```typescript
export const revalidate = 3600; // Revalidate every hour

export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }
  });

  return <div>{JSON.stringify(data)}</div>;
}
```

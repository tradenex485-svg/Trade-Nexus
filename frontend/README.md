# Trade Nexus Frontend

Modern, responsive web application built with Next.js 15 and deployed on Cloudflare Pages.

## Architecture

```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API clients
│   ├── store/           # State management (Zustand)
│   ├── styles/          # Global styles and Tailwind config
│   ├── test/            # Test utilities
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── functions/           # Cloudflare Pages Functions
├── .storybook/          # Storybook configuration
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── package.json
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 18.3+
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form (implied)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Testing**: Vitest + Testing Library
- **Component Development**: Storybook
- **Deployment**: Cloudflare Pages

## Features

### Pages & Modules

#### Authentication
- Login/logout with JWT
- Registration
- Password reset flow
- SAML/OAuth SSO integration
- Session management

#### Dashboard
- Overview metrics and KPIs
- Real-time data updates
- Customizable widgets
- Performance indicators

#### Trading Operations
- Pre-trade validation
- Trade entry and management
- Position monitoring
- Bid week management

#### Risk Management
- Position limits tracking
- Market limits monitoring
- Risk metrics dashboard
- Scenario analysis

#### Regulatory Compliance
- CFTC exemption management (request, pending, history)
- Regulatory filings
- Audit trail viewing
- Data quality monitoring

#### Administration
- User management
- Company management
- Trader profiles
- Exchange configuration
- API key management
- Security settings

#### Reporting & Analytics
- Custom report generation
- Financial reports
- Performance analytics
- Data aggregation

#### System Features
- Alert configuration
- Document management
- Calendar/scheduling
- Support tickets
- Subscription management
- Workflow approvals

## Development

### Environment Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Building

```bash
# Build for production
npm run build

# Build for Cloudflare Pages
npm run pages:build

# Start production server locally
npm run start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Storybook

Component library and documentation:

```bash
# Start Storybook dev server
npm run storybook

# Build Storybook static site
npm run build-storybook
```

### Deployment

```bash
# Preview deployment (builds and runs locally with wrangler)
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure

### App Router (`src/app/`)
Next.js 15 app router with file-based routing:

#### Authentication Routes `(auth)/`
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset confirmation
- `/auth/callback` - OAuth/SAML callback

#### Main Application Routes
- `/` - Dashboard home
- `/admin/companies` - Company management
- `/admin/traders` - Trader management
- `/admin/exchanges` - Exchange configuration
- `/aggregation` - Data aggregation
- `/alerts` - Alert management
- `/api-docs` - API documentation
- `/api-keys` - API key management
- `/approvals` - Generic approvals
- `/calendar` - Calendar/scheduling
- `/data-quality` - Data quality monitoring
- `/documents` - Document storage
- `/exemptions/*` - CFTC exemptions
- `/filings` - Regulatory filings
- `/financial` - Financial data
- `/limits` - Position/market limits
- `/monitoring` - System monitoring
- `/performance` - Performance analytics
- `/pre-trade` - Pre-trade validation
- `/profile` - User profile
- `/reports` - Report generation
- `/risk` - Risk management
- `/security` - Security settings
- `/settings` - Application settings
- `/subscriptions` - Subscription management
- `/support` - Support tickets
- `/workflow-approvals` - Workflow approvals

### Components (`src/components/`)
Reusable React components organized by feature:
- `alerts/` - Alert components
- `auth/` - Authentication components
- `cftc/` - CFTC-specific components
- `dashboard/` - Dashboard widgets
- `layout/` - Layout components (header, sidebar, navigation)
- `theme/` - Theme provider and theming components
- `ui/` - Base UI components (buttons, inputs, modals, etc.)

### State Management (`src/store/`)
Zustand stores for global state:
- User authentication state
- Application settings
- UI state (theme, sidebar)
- Cached data

### API Integration (`src/lib/api/`)
API client functions for backend communication:
- Typed API methods
- Error handling
- Request/response interceptors
- Authentication token management

### Custom Hooks (`src/hooks/`)
Reusable React hooks:
- `useAuth` - Authentication state
- `useApi` - API calls with React Query
- `useDebounce` - Debounce values
- `useLocalStorage` - Persistent local storage
- etc.

## Styling

### Tailwind CSS
Utility-first CSS framework configured in `tailwind.config.ts`:
- Custom color palette
- Design tokens
- Responsive breakpoints
- Dark mode support

### CSS Modules
Component-specific styles when needed

### Theme System
Built with CSS variables for easy theming:
- Light/dark mode toggle
- Customizable color schemes
- Consistent spacing and typography

## API Integration

### Backend Communication
Connects to Trade Nexus Backend API:
- Base URL configured via environment variable
- JWT token authentication
- Automatic token refresh
- Error handling and retry logic

### TanStack Query
Data fetching and caching:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers
});

// Mutate data
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }
});
```

## Responsive Design

The application is fully responsive:
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly UI on mobile devices
- Adaptive layouts for tablets and desktops

## Accessibility

Built with accessibility in mind:
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Color contrast compliance
- Focus management
- Tested with @axe-core/react

## Performance

Optimizations:
- Server-side rendering (SSR) with Next.js
- Static generation where possible
- Code splitting and lazy loading
- Image optimization with Next.js Image
- Caching with React Query
- Edge deployment with Cloudflare Pages

## Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=https://api.tradenexus.com
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## Security

- HTTPS only
- JWT token storage in httpOnly cookies (recommended)
- XSS protection
- CSRF protection
- Content Security Policy
- Regular dependency updates

## Error Tracking

Integrated with Sentry for error monitoring:
- Automatic error capture
- User feedback
- Performance monitoring
- Release tracking

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Contributing

1. Create feature branch from `dev`
2. Make changes
3. Write/update tests
4. Ensure all tests pass
5. Build successfully
6. Create pull request to `dev`
7. Deploy to dev environment for testing
8. Merge to `main` for production deployment

# Trade Nexus App

A comprehensive trading and regulatory compliance platform built with modern web technologies and deployed on Cloudflare infrastructure.

## Project Structure

```
trade-nexus-app/
├── backend/          # Hono-based API server (Cloudflare Workers)
├── frontend/         # Next.js web application (Cloudflare Pages)
└── test-results/     # Test execution results
```

## Overview

Trade Nexus is a full-stack trading platform that provides:

- **Trading Operations**: Pre-trade validation, trade approvals, and transaction management
- **Risk Management**: Position limits, market limits, risk metrics and scenario analysis
- **Regulatory Compliance**: CFTC exemptions, regulatory filings, and audit trails
- **Data Management**: Data quality monitoring, CSV imports, and aggregation
- **Administration**: User management, company management, exchange configuration
- **Security**: SAML/OAuth SSO, API key management, and comprehensive security logging

## Technology Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (fast web framework)
- **Database**: Cloudflare D1 (SQLite)
- **Validation**: Zod schemas
- **Authentication**: JWT with SAML/OAuth support
- **Testing**: Vitest with Cloudflare Workers integration

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18 with Radix UI components
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Testing**: Vitest with Testing Library
- **Deployment**: Cloudflare Pages

## Getting Started

### Prerequisites
- Node.js 18+
- Wrangler CLI (Cloudflare's development tool)
- Git

### Backend Setup

```bash
cd backend
npm install
npm run dev              # Start development server
npm run db:migrate       # Run database migrations (local)
npm test                 # Run tests
npm run deploy          # Deploy to Cloudflare Workers
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev             # Start development server
npm run build          # Build for production
npm run deploy         # Deploy to Cloudflare Pages
```

## Development Workflow

1. Make changes in the `dev` branch
2. Test locally with `npm run dev` (both backend and frontend)
3. Run tests with `npm test`
4. Deploy to development environment for validation
5. Create pull request to `main` branch

## Project Documentation

- Backend API documentation: See `backend/README.md`
- Frontend architecture: See `frontend/README.md`
- Database schema: See `backend/migrations/`
- Component library: Run `npm run storybook` in frontend

## Deployment

Both backend and frontend are configured for automatic deployment to Cloudflare:

- **Backend API**: Deployed to Cloudflare Workers
- **Frontend**: Deployed to Cloudflare Pages
- **Database**: Cloudflare D1

Deploy commands are configured in respective `package.json` files.

## License

Private - All rights reserved

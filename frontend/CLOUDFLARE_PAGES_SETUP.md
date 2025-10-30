# Cloudflare Pages Configuration for Dev/Prod Workflow

## Current Setup

### Production Branch
- **Branch:** `main`
- **URL:** `https://trade-nexus-frontend.pages.dev`
- **Backend API:** `https://trade-nexus-api.tradenex485.workers.dev` (production)

### Development Branch
- **Branch:** `dev`
- **URL:** `https://dev.trade-nexus-frontend.pages.dev` (auto-generated)
- **Backend API:** `https://trade-nexus-api-dev.tradenex485.workers.dev`

## Steps to Configure Dev Branch Auto-Deployment

### 1. Access Cloudflare Pages Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **trade-nexus-frontend**

### 2. Enable Dev Branch Deployments
1. Click on **Settings** tab
2. Go to **Builds & deployments** section
3. Under **Preview deployments**, ensure it's enabled
4. Add `dev` to the list of branches that should auto-deploy

### 3. Configure Environment Variables for Dev

#### In Cloudflare Pages Dashboard:
1. Go to **Settings** → **Environment variables**
2. Click **Add variable**
3. Create environment variable for **Preview** deployments:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://trade-nexus-api-dev.tradenex485.workers.dev` | Preview |

4. Ensure the **Production** environment has:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://trade-nexus-api.tradenex485.workers.dev` | Production |

### 4. Branch Configuration

The configuration should look like:

```
Production branch: main
Preview branches: All branches (or specifically 'dev')
Build command: npm run build
Build output directory: out
Root directory: (leave empty)
```

## Deployment URLs After Setup

### Automatic Deployments
- **Push to `main`** → Deploys to `https://trade-nexus-frontend.pages.dev` (Production)
- **Push to `dev`** → Deploys to `https://dev.trade-nexus-frontend.pages.dev` (Preview)
- **Any other branch** → Gets unique preview URL

### Manual Deployment Commands

```bash
# Deploy dev branch
wrangler pages deploy out --project-name trade-nexus-frontend --branch dev

# Deploy production (main branch)
wrangler pages deploy out --project-name trade-nexus-frontend --branch main
```

## Verification Steps

After configuration:

1. **Test Dev Deployment**
   ```bash
   git checkout dev
   npm run build
   wrangler pages deploy out --project-name trade-nexus-frontend --branch dev
   ```

2. **Verify Environment**
   - Visit `https://dev.trade-nexus-frontend.pages.dev`
   - Open browser console and check API calls
   - Verify they go to `trade-nexus-api-dev.tradenex485.workers.dev`

3. **Test Production**
   - Visit `https://trade-nexus-frontend.pages.dev`
   - Verify API calls go to production backend

## Troubleshooting

### Dev deployment not showing up
- Check that `dev` branch exists on GitHub/remote
- Verify preview deployments are enabled in Cloudflare Pages
- Check deployment history in Cloudflare dashboard

### Wrong API URL
- Verify environment variables are set for correct environment (Preview vs Production)
- Clear browser cache and hard refresh
- Check `.env.local` is not overriding production environment variables

## Security Notes

- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ Environment variables are set in Cloudflare Pages dashboard
- ✅ Dev and prod use separate backend APIs with separate databases
- ✅ CORS is configured on backend to allow both dev and prod frontend URLs

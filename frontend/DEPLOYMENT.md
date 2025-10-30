# Trade Nexus Frontend - Deployment Guide

## 🔄 Development Workflow

### Overview
All changes MUST go through the dev environment before being deployed to production.

```
Local Development → Dev Branch → Dev Environment → Testing → Main Branch → Production
```

### The Golden Rule
**NEVER push directly to main or deploy to production without testing in dev first.**

---

## 🌿 Branch Strategy

### Development Branch (`dev`)
- All new features and bug fixes start here
- Auto-deploys to: `https://dev.trade-nexus-frontend.pages.dev`
- Connected to dev backend: `https://trade-nexus-api-dev.tradenex485.workers.dev`

### Production Branch (`main`)
- Only merge from `dev` after thorough testing
- Auto-deploys to: `https://trade-nexus-frontend.pages.dev`
- Connected to prod backend: `https://trade-nexus-api.tradenex485.workers.dev`

---

## 📋 Step-by-Step Deployment Process

### 1. Make Changes in Dev Branch

```bash
# Ensure you're on dev branch
git checkout dev

# Pull latest changes
git pull origin dev

# Make your changes to the code
# ... edit files ...

# Test locally
npm run dev

# Build to verify no errors
npm run build
```

### 2. Commit and Push to Dev

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature X"

# Push to dev branch
git push origin dev
```

**What happens:**
- Cloudflare Pages automatically detects the push
- Builds and deploys to dev environment
- Available at: `https://dev.trade-nexus-frontend.pages.dev`

### 3. Test in Dev Environment

Visit `https://dev.trade-nexus-frontend.pages.dev` and verify:

✅ **Functional Testing**
- [ ] All features work as expected
- [ ] No console errors
- [ ] Forms submit correctly
- [ ] API calls succeed

✅ **Authentication Testing**
- [ ] Demo login works for all 6 accounts
- [ ] Registration flow works
- [ ] Password reset flow works
- [ ] Logout works
- [ ] Token refresh works

✅ **Dashboard Testing**
- [ ] All charts render
- [ ] Data loads correctly
- [ ] Filters work
- [ ] No missing data

✅ **Cross-Browser Testing**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

✅ **Mobile Responsiveness**
- [ ] Mobile view works
- [ ] Tablet view works
- [ ] Desktop view works

### 4. Merge to Main (Production)

**Only after dev testing is complete:**

```bash
# Checkout main branch
git checkout main

# Pull latest main
git pull origin main

# Merge dev into main
git merge dev

# Push to main
git push origin main
```

**What happens:**
- Cloudflare Pages automatically detects the push
- Builds and deploys to production
- Available at: `https://trade-nexus-frontend.pages.dev`

### 5. Verify Production Deployment

Visit `https://trade-nexus-frontend.pages.dev` and do a quick smoke test:

- [ ] Login works
- [ ] Dashboard loads
- [ ] No console errors

---

## 🚀 Manual Deployment Commands

### Deploy to Dev
```bash
# Build the application
npm run build

# Deploy to dev environment
wrangler pages deploy out --project-name trade-nexus-frontend --branch dev
```

### Deploy to Production
```bash
# Build the application
npm run build

# Deploy to production environment
wrangler pages deploy out --project-name trade-nexus-frontend --branch main
```

---

## 🔧 Environment Configuration

### Development Environment
- **Branch:** `dev`
- **URL:** `https://dev.trade-nexus-frontend.pages.dev`
- **Backend API:** `https://trade-nexus-api-dev.tradenex485.workers.dev`
- **Database:** `trade-nexus-db-dev` (Cloudflare D1)

### Production Environment
- **Branch:** `main`
- **URL:** `https://trade-nexus-frontend.pages.dev`
- **Backend API:** `https://trade-nexus-api.tradenex485.workers.dev`
- **Database:** `trade-nexus-db` (Cloudflare D1)

---

## 🛠️ Troubleshooting

### Dev deployment not working
1. Check Cloudflare Pages dashboard for build errors
2. Verify `dev` branch exists on GitHub
3. Check environment variables in Cloudflare Pages settings

### Wrong backend API being called
1. Check environment variables in Cloudflare Pages
2. Verify `.env.local` is not being committed
3. Hard refresh browser (Ctrl+Shift+R)

### Build fails on Cloudflare
1. Check build logs in Cloudflare Pages dashboard
2. Verify build works locally: `npm run build`
3. Check Next.js version compatibility

### Changes not appearing after deployment
1. Wait 1-2 minutes for CDN cache to clear
2. Hard refresh browser (Ctrl+Shift+R)
3. Check deployment status in Cloudflare dashboard

---

## 📝 Deployment Checklist Template

Use this template when deploying to production:

```markdown
## Deployment Checklist

### Pre-Deployment (Dev)
- [ ] Code changes committed to dev branch
- [ ] Deployed to dev environment
- [ ] All tests pass in dev
- [ ] No console errors
- [ ] Mobile responsive tested
- [ ] Cross-browser tested

### Deployment (Prod)
- [ ] Dev branch merged to main
- [ ] Pushed to main branch
- [ ] Deployment successful in Cloudflare
- [ ] Smoke tests passed in production
- [ ] Team notified of deployment

### Post-Deployment
- [ ] Monitor error logs for 30 minutes
- [ ] Check user feedback channels
- [ ] Document any issues found
```

---

## 🔒 Security Considerations

- ✅ Never commit sensitive data (`.env.local`, API keys)
- ✅ Environment variables managed in Cloudflare Pages dashboard
- ✅ Dev and prod databases are completely separate
- ✅ CORS configured to allow only known domains
- ✅ Rate limiting enabled on backend APIs

---

## 📞 Deployment Support

### Useful Links
- [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
- [Backend API Health Check (Dev)](https://trade-nexus-api-dev.tradenex485.workers.dev/health)
- [Backend API Health Check (Prod)](https://trade-nexus-api.tradenex485.workers.dev/health)

### Emergency Rollback

If production breaks:

```bash
# Quick rollback to previous commit
git checkout main
git reset --hard HEAD~1  # Rollback 1 commit
git push -f origin main  # Force push (use with caution!)
```

Or use Cloudflare Pages dashboard to redeploy a previous successful deployment.

---

## 📅 Version History

| Date | Version | Environment | Changes |
|------|---------|-------------|---------|
| 2025-10-30 | 1.0.1 | Dev, Prod | Fixed reset password API endpoint |
| 2025-10-29 | 1.0.0 | Prod | Initial deployment |

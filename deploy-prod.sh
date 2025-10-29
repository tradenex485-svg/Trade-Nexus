#!/bin/bash

# Deploy Trade Nexus to Production Environment
# This script deploys both backend and frontend to production with safety checks

set -e  # Exit on error

echo "======================================="
echo "Trade Nexus - Production Deployment"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Safety check: Must be on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}ERROR: Production deployments must be from 'main' branch!${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    echo ""
    echo "To deploy to production:"
    echo "  1. Merge your changes to main: git checkout main && git merge develop"
    echo "  2. Run this script again"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}ERROR: You have uncommitted changes!${NC}"
    echo "Commit or stash your changes before deploying to production."
    exit 1
fi

# Check if local main is up to date with remote
git fetch origin main 2>/dev/null || true
if [[ $(git rev-list HEAD...origin/main --count 2>/dev/null) != "0" ]]; then
    echo -e "${YELLOW}Warning: Your local main branch may be out of sync with remote.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${YELLOW}==================== WARNING ====================${NC}"
echo -e "${YELLOW}You are about to deploy to PRODUCTION!${NC}"
echo -e "${YELLOW}=================================================${NC}"
echo ""
echo "Branch: $CURRENT_BRANCH"
echo "Commit: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%B | head -n 1)"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Ask for version tag
echo ""
echo "Enter version tag for this release (e.g., v1.0.1):"
read -p "Version: " VERSION_TAG

if [ -z "$VERSION_TAG" ]; then
    echo -e "${RED}ERROR: Version tag is required for production deployments${NC}"
    exit 1
fi

# Check if tag already exists
if git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Tag $VERSION_TAG already exists!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Deploying Backend (Cloudflare Workers)${NC}"
echo "--------------------------------------"
cd backend

echo "Running database migrations..."
wrangler d1 migrations apply trade-nexus-db

echo "Deploying worker to production..."
wrangler deploy

WORKER_URL="https://trade-nexus-api.metabilityllc1.workers.dev"
echo -e "${GREEN}✓ Backend deployed to: $WORKER_URL${NC}"
echo ""

cd ..

echo -e "${BLUE}Step 2: Deploying Frontend (Cloudflare Pages)${NC}"
echo "--------------------------------------"
cd frontend

# Use production backend URL
export NEXT_PUBLIC_API_URL="$WORKER_URL"
echo "Using API URL: $NEXT_PUBLIC_API_URL"

echo "Building frontend..."
npm run build

echo "Deploying to Cloudflare Pages (production)..."
wrangler pages deploy out --project-name=trade-nexus-frontend --branch=main

FRONTEND_URL="https://trade-nexus-frontend.pages.dev"
echo -e "${GREEN}✓ Frontend deployed to: $FRONTEND_URL${NC}"
echo ""

cd ..

echo -e "${BLUE}Step 3: Creating Git Tag${NC}"
echo "--------------------------------------"
git tag -a "$VERSION_TAG" -m "Production release $VERSION_TAG"
echo -e "${GREEN}✓ Created tag: $VERSION_TAG${NC}"

# Ask if they want to push the tag
read -p "Push tag to remote? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$VERSION_TAG" 2>/dev/null || echo -e "${YELLOW}Note: Could not push to remote (may not be configured)${NC}"
fi

echo ""
echo -e "${GREEN}========================================="
echo "   Production Deployment Complete!"
echo "=========================================${NC}"
echo ""
echo "Version: $VERSION_TAG"
echo "Backend API: $WORKER_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo -e "${BLUE}Post-Deployment Checklist:${NC}"
echo "  [ ] Test login functionality"
echo "  [ ] Verify dashboard loads correctly"
echo "  [ ] Check API health: $WORKER_URL/health"
echo "  [ ] Monitor logs: wrangler tail trade-nexus-api"
echo "  [ ] Update release notes"
echo ""

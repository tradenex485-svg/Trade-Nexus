#!/bin/bash

###############################################################################
# CFTC Position Limits Enhancement - Deployment Script
#
# This script deploys the CFTC enhancements to the dev environment
#
# Prerequisites:
# - Wrangler CLI installed and configured
# - Logged into Cloudflare account
# - Database access configured
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV="dev"
DB_NAME="trade-nexus-db"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CFTC Enhancement Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Verify Prerequisites
echo -e "${YELLOW}Step 1: Verifying prerequisites...${NC}"

if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install it first:"
    echo "  npm install -g wrangler"
    exit 1
fi
print_status "Wrangler CLI installed"

if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first"
    exit 1
fi
print_status "Node.js installed"

echo ""

# Step 2: Run Database Migration
echo -e "${YELLOW}Step 2: Running database migration...${NC}"

cd "$BACKEND_DIR"

# Check if migration file exists
if [ ! -f "migrations/0020_cftc_enhancements.sql" ]; then
    print_error "Migration file not found: migrations/0020_cftc_enhancements.sql"
    exit 1
fi

# Apply migration to local database first (for testing)
echo "Applying migration to local database..."
wrangler d1 execute "$DB_NAME" --local --file=./migrations/0020_cftc_enhancements.sql || {
    print_error "Migration failed on local database"
    exit 1
}
print_status "Migration applied to local database"

# Ask for confirmation before applying to remote
echo ""
read -p "Apply migration to remote ($ENV) database? (yes/no): " confirm
if [ "$confirm" == "yes" ]; then
    echo "Applying migration to remote database..."
    wrangler d1 execute "$DB_NAME" --remote --file=./migrations/0020_cftc_enhancements.sql || {
        print_error "Migration failed on remote database"
        exit 1
    }
    print_status "Migration applied to remote database"
else
    print_warning "Skipping remote database migration"
fi

echo ""

# Step 3: Install Dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"

echo "Installing backend dependencies..."
npm install || {
    print_error "Failed to install backend dependencies"
    exit 1
}
print_status "Backend dependencies installed"

cd ../"$FRONTEND_DIR"
echo "Installing frontend dependencies..."
npm install || {
    print_error "Failed to install frontend dependencies"
    exit 1
}
print_status "Frontend dependencies installed"

cd ..

echo ""

# Step 4: Build Backend
echo -e "${YELLOW}Step 4: Building backend...${NC}"

cd "$BACKEND_DIR"
npm run build || {
    print_error "Backend build failed"
    exit 1
}
print_status "Backend built successfully"

echo ""

# Step 5: Deploy Backend
echo -e "${YELLOW}Step 5: Deploying backend...${NC}"

read -p "Deploy backend to Cloudflare Workers? (yes/no): " confirm_backend
if [ "$confirm_backend" == "yes" ]; then
    wrangler deploy || {
        print_error "Backend deployment failed"
        exit 1
    }
    print_status "Backend deployed successfully"

    # Get the deployment URL
    BACKEND_URL=$(wrangler deployments list | grep -m 1 "https://" | awk '{print $NF}')
    print_status "Backend URL: $BACKEND_URL"
else
    print_warning "Skipping backend deployment"
fi

cd ..

echo ""

# Step 6: Build Frontend
echo -e "${YELLOW}Step 6: Building frontend...${NC}"

cd "$FRONTEND_DIR"
npm run build || {
    print_error "Frontend build failed"
    exit 1
}
print_status "Frontend built successfully"

echo ""

# Step 7: Deploy Frontend
echo -e "${YELLOW}Step 7: Deploying frontend...${NC}"

read -p "Deploy frontend to Cloudflare Pages? (yes/no): " confirm_frontend
if [ "$confirm_frontend" == "yes" ]; then
    wrangler pages deploy dist || {
        print_error "Frontend deployment failed"
        exit 1
    }
    print_status "Frontend deployed successfully"

    # Get the deployment URL
    FRONTEND_URL=$(wrangler pages deployment list | grep -m 1 "https://" | awk '{print $NF}')
    print_status "Frontend URL: $FRONTEND_URL"
else
    print_warning "Skipping frontend deployment"
fi

cd ..

echo ""

# Step 8: Initialize Bid Week Schedules
echo -e "${YELLOW}Step 8: Initializing bid week schedules...${NC}"

if [ -n "$BACKEND_URL" ]; then
    echo "Generating bid week schedules for all exchanges..."

    # Call auto-generate endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/bid-week/auto-generate")

    if echo "$response" | grep -q "success"; then
        print_status "Bid week schedules initialized"
    else
        print_warning "Bid week schedule initialization may have issues. Check manually."
        echo "Response: $response"
    fi
else
    print_warning "Backend URL not available. Please manually initialize bid week schedules:"
    echo "  curl -X POST https://your-api.workers.dev/api/bid-week/auto-generate"
fi

echo ""

# Step 9: Run Smoke Tests
echo -e "${YELLOW}Step 9: Running smoke tests...${NC}"

if [ -n "$BACKEND_URL" ]; then
    echo "Testing health endpoint..."
    health_response=$(curl -s "$BACKEND_URL/health")

    if echo "$health_response" | grep -q "healthy"; then
        print_status "Health check passed"
    else
        print_error "Health check failed"
        echo "Response: $health_response"
    fi

    echo "Testing bid week status endpoint..."
    bidweek_response=$(curl -s "$BACKEND_URL/api/bid-week/status/all")

    if echo "$bidweek_response" | grep -q "exchanges"; then
        print_status "Bid week status endpoint working"
    else
        print_warning "Bid week status endpoint may have issues"
        echo "Response: $bidweek_response"
    fi

    echo "Testing position limits endpoint..."
    limits_response=$(curl -s "$BACKEND_URL/api/position-limits")

    if echo "$limits_response" | grep -q "results\|calculations"; then
        print_status "Position limits endpoint working"
    else
        print_warning "Position limits endpoint may have issues"
    fi
else
    print_warning "Backend URL not available. Skipping smoke tests."
    echo "Please run smoke tests manually after deployment."
fi

echo ""

# Step 10: Post-Deployment Instructions
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ -n "$BACKEND_URL" ]; then
    echo -e "${YELLOW}Backend URL:${NC} $BACKEND_URL"
fi

if [ -n "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}Frontend URL:${NC} $FRONTEND_URL"
fi

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify all endpoints are accessible"
echo "2. Run comprehensive test suite (see CFTC_TEST_PLAN.md)"
echo "3. Review exception dashboard for any issues"
echo "4. Generate test reports"
echo "5. Conduct UAT with business users"
echo "6. Document any issues found"
echo ""

echo -e "${YELLOW}Important Notes:${NC}"
echo "- Review CFTC_IMPLEMENTATION_SUMMARY.md for details on what was implemented"
echo "- Phase 3-9 implementations are documented but not yet coded"
echo "- Complete remaining phases before full production deployment"
echo "- Update holiday calendars annually"
echo "- Monitor validation logs regularly"
echo ""

echo -e "${YELLOW}Manual Tasks Required:${NC}"
echo "1. Complete Phase 3: Subset Reports implementation"
echo "2. Complete Phase 4: Diminishing Balance logic"
echo "3. Complete Phase 5: Deal Type Filtering"
echo "4. Complete Phase 6: Exception Handling UI"
echo "5. Complete Phase 7: Economic Equivalence service"
echo "6. Complete Phase 8: Dashboard Drill-Down UI"
echo "7. Complete Phase 9: CFTC Validation service"
echo "8. Run full test suite (127 tests)"
echo ""

echo -e "${GREEN}For support, refer to:${NC}"
echo "- CFTC_IMPLEMENTATION_SUMMARY.md - Implementation details"
echo "- CFTC_TEST_PLAN.md - Comprehensive test plan"
echo "- backend/src/services/bid-week-service.ts - Bid week implementation"
echo "- backend/src/routes/bid-week.ts - Bid week API endpoints"
echo ""

print_status "Deployment script completed successfully!"

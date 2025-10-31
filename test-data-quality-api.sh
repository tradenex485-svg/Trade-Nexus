#!/bin/bash

# Data Quality API Test Script
# Tests all Data Quality endpoints with different user roles

API_URL="https://trade-nexus-api-dev.tradenex485.workers.dev"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_test() {
    local test_name=$1
    local status=$2
    local response=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name"
        echo -e "${YELLOW}Response: $response${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local expected_status=$4
    local description=$5
    local data=$6

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "$expected_status" ]; then
        print_test "$description" "PASS" "$body"
    else
        print_test "$description (Expected: $expected_status, Got: $http_code)" "FAIL" "$body"
    fi
}

echo "========================================"
echo "Data Quality API Testing"
echo "========================================"
echo ""

# Step 1: Login and get tokens
echo -e "${BLUE}Step 1: Logging in users...${NC}"
echo ""

TRADER_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"trader@nexus.com","password":"demo123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

SUPERADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"superadmin@nexus.com","password":"demo123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

SYSADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"sysadmin@nexus.com","password":"demo123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TRADER_TOKEN" ]; then
    echo -e "${RED}Failed to get trader token${NC}"
    exit 1
fi

if [ -z "$SUPERADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to get superadmin token${NC}"
    exit 1
fi

if [ -z "$SYSADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to get sysadmin token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Successfully logged in all users${NC}"
echo ""

# Step 2: Test GET /api/data-quality/dashboard
echo -e "${BLUE}Step 2: Testing GET /api/data-quality/dashboard${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/dashboard" "$TRADER_TOKEN" "200" \
    "Trader can access dashboard"

test_endpoint "GET" "/api/data-quality/dashboard" "$SYSADMIN_TOKEN" "200" \
    "Admin can access dashboard"

test_endpoint "GET" "/api/data-quality/dashboard" "$SUPERADMIN_TOKEN" "200" \
    "Super Admin can access dashboard"

echo ""

# Step 3: Test GET /api/data-quality/issues
echo -e "${BLUE}Step 3: Testing GET /api/data-quality/issues${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/issues?status=open&limit=10" "$TRADER_TOKEN" "200" \
    "Trader can view issues"

test_endpoint "GET" "/api/data-quality/issues?severity=critical" "$SYSADMIN_TOKEN" "200" \
    "Admin can view critical issues"

test_endpoint "GET" "/api/data-quality/issues" "$SUPERADMIN_TOKEN" "200" \
    "Super Admin can view all issues"

echo ""

# Step 4: Test GET /api/data-quality/rules
echo -e "${BLUE}Step 4: Testing GET /api/data-quality/rules${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/rules" "$TRADER_TOKEN" "200" \
    "Trader can view rules"

test_endpoint "GET" "/api/data-quality/rules?include_inactive=true" "$SYSADMIN_TOKEN" "200" \
    "Admin can view all rules including inactive"

echo ""

# Step 5: Test POST /api/data-quality/rules (Role-based authorization)
echo -e "${BLUE}Step 5: Testing POST /api/data-quality/rules (Authorization)${NC}"
echo ""

RULE_DATA='{"rule_name":"Test Rule","rule_type":"required_field","target_table":"transactions","target_field":"test_field","rule_config":"{\"field\":\"test_field\"}","severity":"medium","description":"Test rule for API testing"}'

test_endpoint "POST" "/api/data-quality/rules" "$TRADER_TOKEN" "403" \
    "Trader CANNOT create rules (expected 403)"

test_endpoint "POST" "/api/data-quality/rules" "$SYSADMIN_TOKEN" "201" \
    "Admin can create rules" "$RULE_DATA"

echo ""

# Step 6: Test PUT /api/data-quality/rules/:id (Role-based authorization)
echo -e "${BLUE}Step 6: Testing PUT /api/data-quality/rules/:id (Authorization)${NC}"
echo ""

UPDATE_RULE_DATA='{"rule_name":"Updated Test Rule","rule_type":"required_field","target_table":"transactions","target_field":"test_field","rule_config":"{\"field\":\"test_field\"}","severity":"high","description":"Updated test rule","is_active":true}'

test_endpoint "PUT" "/api/data-quality/rules/1" "$TRADER_TOKEN" "403" \
    "Trader CANNOT update rules (expected 403)"

test_endpoint "PUT" "/api/data-quality/rules/1" "$SYSADMIN_TOKEN" "200" \
    "Admin can update rules" "$UPDATE_RULE_DATA"

echo ""

# Step 7: Test DELETE /api/data-quality/rules/:id (Role-based authorization)
echo -e "${BLUE}Step 7: Testing DELETE /api/data-quality/rules/:id (Authorization)${NC}"
echo ""

test_endpoint "DELETE" "/api/data-quality/rules/999" "$TRADER_TOKEN" "403" \
    "Trader CANNOT delete rules (expected 403)"

test_endpoint "DELETE" "/api/data-quality/rules/999" "$SYSADMIN_TOKEN" "200" \
    "Admin can delete rules (non-existent rule)"

echo ""

# Step 8: Test POST /api/data-quality/run (Role-based authorization)
echo -e "${BLUE}Step 8: Testing POST /api/data-quality/run (Authorization)${NC}"
echo ""

test_endpoint "POST" "/api/data-quality/run" "$TRADER_TOKEN" "403" \
    "Trader CANNOT run quality checks (expected 403)"

test_endpoint "POST" "/api/data-quality/run" "$SYSADMIN_TOKEN" "200" \
    "Admin can run quality checks"

echo ""

# Step 9: Test GET /api/data-quality/reconciliation
echo -e "${BLUE}Step 9: Testing GET /api/data-quality/reconciliation${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/reconciliation?limit=20" "$TRADER_TOKEN" "200" \
    "Trader can view reconciliation history"

test_endpoint "GET" "/api/data-quality/reconciliation" "$SYSADMIN_TOKEN" "200" \
    "Admin can view reconciliation history"

echo ""

# Step 10: Test POST /api/data-quality/reconciliation (Role-based authorization)
echo -e "${BLUE}Step 10: Testing POST /api/data-quality/reconciliation (Authorization)${NC}"
echo ""

RECON_DATA='{"source_table":"transactions","target_table":"limit_calculations","reconciliation_key":"market_location"}'

test_endpoint "POST" "/api/data-quality/reconciliation" "$TRADER_TOKEN" "403" \
    "Trader CANNOT run reconciliation (expected 403)"

test_endpoint "POST" "/api/data-quality/reconciliation" "$SYSADMIN_TOKEN" "200" \
    "Admin can run reconciliation" "$RECON_DATA"

echo ""

# Step 11: Test GET /api/data-quality/lineage/:table/:id
echo -e "${BLUE}Step 11: Testing GET /api/data-quality/lineage/:table/:id${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/lineage/transactions/1" "$TRADER_TOKEN" "200" \
    "Trader can view data lineage"

test_endpoint "GET" "/api/data-quality/lineage/transactions/1" "$SYSADMIN_TOKEN" "200" \
    "Admin can view data lineage"

echo ""

# Step 12: Test PUT /api/data-quality/issues/:id (Role-based authorization)
echo -e "${BLUE}Step 12: Testing PUT /api/data-quality/issues/:id (Authorization)${NC}"
echo ""

ISSUE_UPDATE_DATA='{"status":"resolved","resolution_notes":"Fixed via API test"}'

test_endpoint "PUT" "/api/data-quality/issues/1" "$TRADER_TOKEN" "403" \
    "Trader CANNOT update issues (expected 403)"

test_endpoint "PUT" "/api/data-quality/issues/1" "$SYSADMIN_TOKEN" "200" \
    "Admin can update issues" "$ISSUE_UPDATE_DATA"

echo ""

# Step 13: Test GET /api/data-quality/uploads
echo -e "${BLUE}Step 13: Testing GET /api/data-quality/uploads${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/uploads?limit=50" "$TRADER_TOKEN" "200" \
    "Trader can view upload history"

test_endpoint "GET" "/api/data-quality/uploads?status=completed" "$SYSADMIN_TOKEN" "200" \
    "Admin can view upload history with filter"

echo ""

# Step 14: Test GET /api/data-quality/stats
echo -e "${BLUE}Step 14: Testing GET /api/data-quality/stats${NC}"
echo ""

test_endpoint "GET" "/api/data-quality/stats" "$TRADER_TOKEN" "200" \
    "Trader can view stats"

test_endpoint "GET" "/api/data-quality/stats" "$SYSADMIN_TOKEN" "200" \
    "Admin can view stats"

test_endpoint "GET" "/api/data-quality/stats" "$SUPERADMIN_TOKEN" "200" \
    "Super Admin can view stats"

echo ""

# Print summary
echo "========================================"
echo -e "${BLUE}Test Summary${NC}"
echo "========================================"
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo "========================================"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi

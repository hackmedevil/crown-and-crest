#!/bin/bash

# Test script for inventory cleanup cron job
# Usage: ./test-cleanup.sh [local|production]

set -e

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    URL="http://localhost:3000/api/cron/cleanup-reservations"
    SECRET=${CRON_SECRET:-"dev-secret-123"}
    echo "Testing LOCAL endpoint: $URL"
elif [ "$ENV" = "production" ]; then
    if [ -z "$PRODUCTION_URL" ]; then
        echo "Error: PRODUCTION_URL environment variable not set"
        echo "Usage: PRODUCTION_URL=https://your-domain.com ./test-cleanup.sh production"
        exit 1
    fi
    URL="$PRODUCTION_URL/api/cron/cleanup-reservations"
    if [ -z "$CRON_SECRET" ]; then
        echo "Error: CRON_SECRET environment variable not set"
        exit 1
    fi
    SECRET=$CRON_SECRET
    echo "Testing PRODUCTION endpoint: $URL"
else
    echo "Usage: ./test-cleanup.sh [local|production]"
    exit 1
fi

echo "Using Authorization: Bearer ${SECRET:0:10}..."
echo ""

# Make request
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$URL" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json")

# Extract body and status
body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')
status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Response status: $status"
echo "Response body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# Check status
if [ "$status" = "200" ]; then
    echo ""
    echo "✅ Cleanup job executed successfully"
    
    # Parse and display metrics
    orders_processed=$(echo "$body" | jq -r '.orders_processed' 2>/dev/null || echo "N/A")
    duration=$(echo "$body" | jq -r '.duration_ms' 2>/dev/null || echo "N/A")
    
    echo "📊 Metrics:"
    echo "   Orders processed: $orders_processed"
    echo "   Duration: ${duration}ms"
else
    echo ""
    echo "❌ Cleanup job failed"
    exit 1
fi

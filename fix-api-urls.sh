#!/bin/bash

# Script to fix API URLs in all frontend files to use internal Docker network

echo "🔧 Fixing API URLs for Docker deployment..."

# Update dashboard page
sed -i 's|process.env.NEXT_PUBLIC_API_URL|process.env.INTERNAL_API_URL \|\| process.env.NEXT_PUBLIC_API_URL|g' frontend/src/app/dashboard/page.tsx

# Update all API route files
find frontend/src/app/api -name "*.ts" -exec sed -i 's|process.env.NEXT_PUBLIC_API_URL|process.env.INTERNAL_API_URL \|\| process.env.NEXT_PUBLIC_API_URL|g' {} \;

echo "✅ API URLs updated for internal Docker network communication"
#!/bin/bash

# API Testing Script for Task Manager
echo "🧪 Testing Task Manager API..."

# Test local backend directly
echo ""
echo "1. Testing local backend (direct):"
echo "   GET http://localhost:5000/api/health"
curl -s http://localhost:5000/api/health | jq . 2>/dev/null || curl -s http://localhost:5000/api/health

# Test through nginx proxy (if configured)
echo ""
echo ""
echo "2. Testing through nginx proxy:"
echo "   GET https://taskmanager.shadowdragon.dev/api/health"
curl -s https://taskmanager.shadowdragon.dev/api/health | jq . 2>/dev/null || curl -s https://taskmanager.shadowdragon.dev/api/health

# Test signup endpoint
echo ""
echo ""
echo "3. Testing signup endpoint structure:"
echo "   POST https://taskmanager.shadowdragon.dev/api/auth/signup"
echo "   (This should return a method-specific error, not 404)"
curl -s -X POST https://taskmanager.shadowdragon.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{}' | jq . 2>/dev/null || curl -s -X POST https://taskmanager.shadowdragon.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo ""
echo "✅ Test complete!"
echo ""
echo "Expected results:"
echo "- Health check should return status 'OK'"
echo "- Signup test should return validation errors (not 404)"
echo "- If you see 404 errors, check your nginx configuration"
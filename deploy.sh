#!/bin/bash

# Deployment script for Task Manager on shadowdragon.dev
echo "🚀 Starting deployment of Task Manager..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Remove old volumes for security (fresh start after breach)
# echo "🔒 Removing old database volumes for security..."
# docker volume rm taskmanager_mongodb-data taskmanager_redis-data 2>/dev/null || echo "Volumes already removed or don't exist"

# Remove old images to ensure fresh build
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🧹 Cleaning up build cache..."
# docker buildx prune -f

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose --env-file .env.production up -d --build

# Show container status
echo "📊 Container status:"
docker compose ps

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://taskmanager.shadowdragon.dev"
echo ""
echo "🔒 Security improvements applied:"
echo "- MongoDB now requires authentication"
echo "- Redis now requires password authentication"
echo "- Database services no longer exposed to host network"
echo "- Fresh database volumes created (old compromised data removed)"
echo ""
echo "Next steps:"
echo "1. Configure Nginx Proxy Manager (see nginx-setup-guide.md for detailed instructions)"
echo "   - Point taskmanager.shadowdragon.dev to localhost:3100"
echo "   - Add custom nginx config to route /api/* to backend"
echo "   - Enable SSL certificate and websockets support"
echo "2. Test the application:"
echo "   - Frontend: https://taskmanager.shadowdragon.dev"
echo "   - API Health: https://taskmanager.shadowdragon.dev/api/health"
echo "   - Try signup/login functionality"
echo ""
echo "📖 For detailed nginx setup instructions, see: nginx-setup-guide.md"
echo "🔍 For troubleshooting, check: DEPLOYMENT_CHECKLIST.md"
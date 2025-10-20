# Task Manager Deployment Checklist

## Pre-Deployment Security

- [ ] **Change JWT_SECRET** in `.env.production` to a strong, unique value
- [ ] **Change NEXTAUTH_SECRET** in `.env.production` to a strong, unique value
- [ ] **Update OAuth credentials** for production domain in GitHub/Google OAuth apps
- [ ] **Verify OAuth redirect URIs** include `https://taskmanager.shadowdragon.dev/api/auth/callback/github` and `/google`

## Deployment Steps

1. [ ] **Upload project** to your VPS (via git clone, scp, or your preferred method)
2. [ ] **Navigate to project directory** on your VPS
3. [ ] **Run deployment script**: `./deploy.sh`
4. [ ] **Verify containers are running**: `docker-compose ps`

## Nginx Proxy Manager Configuration

5. [ ] **Create proxy host** in Nginx Proxy Manager:
   - Domain: `taskmanager.shadowdragon.dev`
   - Forward to: `localhost:3100` (or container IP)
   - Enable SSL with Let's Encrypt
   - Enable Websockets Support
   - Enable Block Common Exploits

6. [ ] **Configure API routing** (choose one method):
   
   **Method A: Single domain with path routing**
   - Add custom nginx config for `/api/*` and `/socket.io/*` paths
   
   **Method B: Separate API subdomain**
   - Create second proxy host: `api.taskmanager.shadowdragon.dev` → `localhost:5000`
   - Update `NEXT_PUBLIC_API_URL` in docker-compose.yaml

## Post-Deployment Verification

7. [ ] **Test frontend**: Visit `https://taskmanager.shadowdragon.dev`
8. [ ] **Test API**: Check `https://taskmanager.shadowdragon.dev/api/health` (or your API endpoint)
9. [ ] **Test authentication**: Try logging in with GitHub/Google
10. [ ] **Test real-time features**: Verify Socket.IO connections work
11. [ ] **Check logs**: `docker-compose logs -f` to monitor for errors

## OAuth App Configuration

### GitHub OAuth App
- **Homepage URL**: `https://taskmanager.shadowdragon.dev`
- **Authorization callback URL**: `https://taskmanager.shadowdragon.dev/api/auth/callback/github`

### Google OAuth App
- **Authorized JavaScript origins**: `https://taskmanager.shadowdragon.dev`
- **Authorized redirect URIs**: `https://taskmanager.shadowdragon.dev/api/auth/callback/google`

## Monitoring & Maintenance

- [ ] **Set up log rotation** for Docker containers
- [ ] **Configure backup** for MongoDB data volume
- [ ] **Monitor resource usage** in Portainer
- [ ] **Set up health checks** or monitoring alerts

## Troubleshooting Commands

```bash
# View container logs
docker-compose logs -f

# Restart specific service
docker-compose restart frontend
docker-compose restart backend

# Check container status
docker-compose ps

# Access container shell
docker exec -it taskmanager-frontend sh
docker exec -it taskmanager-backend sh

# View nginx proxy manager logs
docker logs nginx-proxy-manager
```
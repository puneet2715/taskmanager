# Nginx Proxy Manager Setup Guide

## Quick Setup Instructions

After running `./deploy.sh`, you need to configure Nginx Proxy Manager to route requests properly.

### Step 1: Create Main Proxy Host

In Nginx Proxy Manager, create a new Proxy Host with these settings:

- **Domain Names**: `taskmanager.shadowdragon.dev`
- **Scheme**: `http`
- **Forward Hostname/IP**: `localhost` (or your server IP)
- **Forward Port**: `3100`
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled (Important for real-time features)

### Step 2: Configure SSL

- **SSL Certificate**: Request a new SSL Certificate with Let's Encrypt
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled

### Step 3: Add Custom Nginx Configuration

In the **Advanced** tab, add this custom configuration:

```nginx
# Proxy API requests to backend (keep /api prefix)
location /api/ {
    proxy_pass http://taskmanager-backend:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Proxy Socket.IO requests for real-time features
location /socket.io/ {
    proxy_pass http://taskmanager-backend:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Step 4: Test the Configuration

1. **Test Frontend**: Visit `https://taskmanager.shadowdragon.dev`
2. **Test API**: Check `https://taskmanager.shadowdragon.dev/api/health`
3. **Test Signup**: Try creating a new account
4. **Test Login**: Try logging in with existing credentials
5. **Test Real-time**: Check if live updates work in the task board

## Troubleshooting

### If signup is still hitting localhost:
1. Check that the nginx configuration was saved properly
2. Verify the containers are running: `docker-compose ps`
3. Check container logs: `docker-compose logs -f backend`
4. Restart nginx proxy manager if needed

### If API requests return 404:
1. Verify the custom nginx configuration is applied
2. Check that the backend container is accessible from nginx
3. Test direct backend access: `curl http://localhost:5000/api/health`

### If real-time features don't work:
1. Ensure Websockets Support is enabled in the proxy host
2. Check that the Socket.IO location block is configured correctly
3. Verify the backend Socket.IO server is running

## Alternative: Separate API Subdomain

If you prefer a separate subdomain for the API:

1. Create a second proxy host: `api.taskmanager.shadowdragon.dev` → `localhost:5000`
2. Update the docker-compose.yaml:
   ```yaml
   - NEXT_PUBLIC_API_URL=https://api.taskmanager.shadowdragon.dev
   ```
3. Restart the containers: `docker-compose restart`
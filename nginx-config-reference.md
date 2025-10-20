# Nginx Proxy Manager Configuration for Task Manager

## Main Application Proxy Host

**Domain:** `taskmanager.shadowdragon.dev`
**Forward Hostname/IP:** `localhost` (or your server IP)
**Forward Port:** `3100`
**Block Common Exploits:** ✅ Enabled
**Websockets Support:** ✅ Enabled (Important for Socket.IO)
**Access List:** None (or as per your security requirements)

### SSL Configuration
- **SSL Certificate:** Let's Encrypt
- **Force SSL:** ✅ Enabled
- **HTTP/2 Support:** ✅ Enabled

## API Proxy Host (Alternative Method)

If you want to serve API on the same domain:

**Domain:** `taskmanager.shadowdragon.dev`
**Forward Hostname/IP:** `localhost`
**Forward Port:** `3100`

### Custom Nginx Configuration (Advanced Tab)
```nginx
# Proxy API requests to backend
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

# Proxy Socket.IO requests
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

## Simple Two-Host Setup (Recommended)

### Frontend Host
- **Domain:** `taskmanager.shadowdragon.dev`
- **Forward to:** `taskmanager-frontend:3000`
- **SSL:** Let's Encrypt

### Backend Host  
- **Domain:** `api.taskmanager.shadowdragon.dev` (if you want separate subdomain)
- **Forward to:** `taskmanager-backend:5000`
- **SSL:** Let's Encrypt

Then update your environment variables:
- `NEXT_PUBLIC_API_URL=https://api.taskmanager.shadowdragon.dev`
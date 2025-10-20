# 2-Host Setup Guide for Task Manager

Since you're using the 2-host approach, here's what you need to configure in Nginx Proxy Manager:

## Step 1: Create Frontend Proxy Host

**Domain Names**: `taskmanager.shadowdragon.dev`
- **Scheme**: `http`
- **Forward Hostname/IP**: `localhost`
- **Forward Port**: `3100`
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled
- **SSL Certificate**: Request new SSL Certificate with Let's Encrypt
- **Force SSL**: ✅ Enabled

## Step 2: Create Backend API Proxy Host

**Domain Names**: `api.taskmanager.shadowdragon.dev`
- **Scheme**: `http`
- **Forward Hostname/IP**: `localhost`
- **Forward Port**: `5000`
- **Cache Assets**: ❌ Disabled (for API)
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled (Important for real-time features)
- **SSL Certificate**: Request new SSL Certificate with Let's Encrypt
- **Force SSL**: ✅ Enabled

## Step 3: Test the Setup

1. **Test Frontend**: Visit `https://taskmanager.shadowdragon.dev`
2. **Test API**: Check `https://api.taskmanager.shadowdragon.dev/api/health`
3. **Test Signup**: Try creating a new account (should work now!)
4. **Test Real-time**: Check if live updates work in the task board

## What I've Fixed

I've hardcoded the API URLs in the following files to use `https://api.taskmanager.shadowdragon.dev`:

- ✅ `frontend/src/components/auth/SignupForm.tsx`
- ✅ `frontend/src/app/auth/signup/page.tsx`
- ✅ `frontend/src/app/admin/page.tsx`
- ✅ `frontend/src/hooks/useSocket.ts` (for real-time updates)
- ✅ `docker-compose.yaml` (updated NEXT_PUBLIC_API_URL)

## Troubleshooting

### If signup still fails:
1. Check that `api.taskmanager.shadowdragon.dev` resolves correctly
2. Test the API directly: `curl https://api.taskmanager.shadowdragon.dev/api/health`
3. Check backend container logs: `docker-compose logs -f backend`

### If real-time updates don't work:
1. Ensure Websockets Support is enabled for the API proxy host
2. Check browser console for socket connection errors
3. Verify the backend Socket.IO server is accessible

### DNS Setup
Make sure both domains point to your server:
- `taskmanager.shadowdragon.dev` → Your server IP
- `api.taskmanager.shadowdragon.dev` → Your server IP

## After Setup

Once both proxy hosts are configured and SSL certificates are issued:

1. Restart the containers: `docker-compose restart`
2. Test all functionality
3. The signup should now work correctly!

The hardcoded URLs will ensure the signup works even if environment variables aren't loading properly.
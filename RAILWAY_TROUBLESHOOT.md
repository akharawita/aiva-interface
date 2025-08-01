# Railway Troubleshooting Guide

## Current Issue: 500 Internal Server Error

### Check Railway Logs:
1. Go to Railway dashboard
2. Click on your service
3. Click "View Logs" to see detailed error messages
4. Look for error stack traces

### Common 500 Error Causes:

#### 1. Missing Environment Variables
Make sure these are set in Railway:
```
NODE_ENV=production
DATABASE_URL=file:./data/data.db?connection_limit=1
DATABASE_PATH=./data/data.db
SESSION_SECRET=your-random-secret
HONEYPOT_SECRET=your-random-secret
PORT=3000
MOCKS=false
ALLOW_INDEXING=true
```

#### 2. Database Connection Issues
- Railway should create `/data` directory during build
- Migrations should run during build phase
- Check logs for "database" or "prisma" errors

#### 3. Missing Dependencies
Moved `tsx` to production dependencies - should fix import issues

#### 4. Build Failures
Check if build phase completed successfully:
- `npm run build` should succeed
- `npx prisma generate` should succeed
- `npx prisma migrate deploy` should succeed

### Debugging Steps:

#### Step 1: Check Logs
Look for these error patterns:
- `Cannot find module` - missing dependencies
- `Database connection failed` - DB issues
- `ENOENT` - missing files
- `Permission denied` - file system issues

#### Step 2: Test Locally
```bash
# Test production build locally
NODE_ENV=production npm run build
NODE_ENV=production npm start
curl http://localhost:3000/health
```

#### Step 3: Simplify Deployment
If still failing, try minimal deployment:
1. Remove database setup from index.js
2. Use simple health check
3. Deploy with just basic app

### Quick Fixes to Try:

1. **Restart Deployment**:
   - Go to Railway dashboard
   - Click "Deploy" → "Restart"

2. **Clear Build Cache**:
   - Delete and redeploy service
   - Or add `NIXPACKS_NO_CACHE=1` environment variable

3. **Check Resource Limits**:
   - Ensure Railway has enough memory/CPU
   - Check if hitting free tier limits

### Alternative Health Check:
If health check is the issue, try simpler version:
```javascript
// app/routes/health.tsx
export function loader() {
  return new Response('OK')
}
```

### Railway-Specific Issues:

1. **File System**: Railway uses ephemeral file system, but `/data` should persist
2. **Port Binding**: Make sure app binds to `process.env.PORT` (Railway sets this)
3. **Build Timeout**: Complex builds might timeout (increase if needed)

### If All Else Fails:
1. Deploy to different platform (Render, Fly.io)
2. Switch to PostgreSQL instead of SQLite
3. Use Vercel with external database
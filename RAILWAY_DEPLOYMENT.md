# Railway Deployment Guide

## Quick Deploy

1. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up/login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository

2. **Railway will auto-detect and deploy** using the `railway.toml` configuration.

## Required Environment Variables

Set these in Railway Dashboard → Variables:

### Essential Variables
```
SESSION_SECRET=your-secret-session-key-here
HONEYPOT_SECRET=your-honeypot-secret-here
DATABASE_URL=file:./data.db?connection_limit=1
NODE_ENV=production
```

### Authentication (GitHub OAuth)
```
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret  
GITHUB_TOKEN=your-github-token
GITHUB_REDIRECT_URI=https://your-app.railway.app/auth/github/callback
```

### Optional Services
```
RESEND_API_KEY=your-resend-api-key (for emails)
SENTRY_DSN=your-sentry-dsn (for error tracking)
ALLOW_INDEXING=true
```

### Object Storage (if needed)
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
BUCKET_NAME=your-bucket-name
```

## Database

Railway will automatically provision a volume for your SQLite database. The app uses Prisma with SQLite, so no external database is required.

## Custom Domain

In Railway Dashboard:
1. Go to Settings → Domains
2. Add your custom domain
3. Update `GITHUB_REDIRECT_URI` to match your domain

## Monitoring

Railway provides built-in metrics and logs. Access them via:
- Dashboard → Metrics
- Dashboard → Logs
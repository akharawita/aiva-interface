# Railway Deployment Guide

## Prerequisites
1. [Railway Account](https://railway.app) (free tier available)
2. Git repository pushed to GitHub/GitLab

## Step 1: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your planning-poker repository
5. Railway will automatically detect the Node.js app

### Option B: Deploy with Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Step 2: Environment Variables

Add these environment variables in Railway dashboard:

### Required Variables:
```bash
NODE_ENV=production
DATABASE_URL=file:./data/data.db?connection_limit=1
DATABASE_PATH=./data/data.db
SESSION_SECRET=your-super-secret-session-key-change-this-to-something-random
HONEYPOT_SECRET=your-honeypot-secret-change-this-to-something-random
ALLOW_INDEXING=true
```

### Optional Variables:
```bash
INTERNAL_COMMAND_TOKEN=some-random-token
GITHUB_CLIENT_ID=MOCK_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=MOCK_GITHUB_CLIENT_SECRET  
GITHUB_TOKEN=MOCK_GITHUB_TOKEN
```

## Step 3: Configure Domain (Optional)
1. In Railway dashboard, go to your project
2. Click on your service
3. Go to "Settings" tab
4. Add custom domain or use the generated railway.app domain

## Step 4: Database Setup
Railway will automatically:
1. Create the `data` directory
2. Run `prisma generate`
3. Run `prisma migrate deploy`
4. Set up the SQLite database with persistent storage

## Features on Railway:
✅ **SQLite Support** - Native file system persistence  
✅ **Automatic Deploys** - Push to git = auto deploy  
✅ **Environment Variables** - Easy configuration  
✅ **Custom Domains** - Free HTTPS  
✅ **Logs & Metrics** - Built-in monitoring  
✅ **Free Tier** - $5 credits/month  

## File Structure:
```
├── railway.json          # Railway configuration
├── nixpacks.toml         # Build configuration  
├── .railwayignore        # Files to ignore
├── .env.railway          # Environment template
├── scripts/
│   └── setup-railway.sh  # Setup script
└── RAILWAY_DEPLOY.md     # This guide
```

## Troubleshooting:

### Build Issues:
- Check Railway logs in dashboard
- Ensure Node.js 22 is specified in nixpacks.toml
- Verify all dependencies are in package.json

### Database Issues:
- Railway provides persistent storage for SQLite
- Database file is stored in `/data/data.db`
- Migrations run automatically during build

### Environment Variables:
- Set in Railway dashboard under "Variables" tab
- Restart deployment after adding variables
- Use Railway CLI: `railway variables set KEY=value`

## Cost Estimation:
- **Free Tier**: $5/month credits (covers small apps)
- **Typical Usage**: ~$2-3/month for planning poker app
- **Scaling**: Pay only for what you use

Your planning poker app will be live at: `https://your-app-name.railway.app`
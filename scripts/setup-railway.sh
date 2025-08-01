#!/bin/bash

# Setup script for Railway deployment
echo "🚀 Setting up Railway deployment..."

# Create data directory for SQLite
mkdir -p data

# Run database setup
echo "📦 Setting up database..."
npx prisma generate
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Railway setup complete!"
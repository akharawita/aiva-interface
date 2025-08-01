#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

console.log('🚀 Starting Railway app...')

try {
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    console.log('📁 Creating data directory...')
    mkdirSync(dataDir, { recursive: true })
  }

  // Run database migrations if needed
  const dbPath = path.join(dataDir, 'data.db')
  if (!existsSync(dbPath)) {
    console.log('🗄️ Setting up database...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Database setup complete')
  }

  // Start the application
  console.log('🎯 Starting planning poker app...')
  execSync('node .', { stdio: 'inherit' })
} catch (error) {
  console.error('❌ Startup failed:', error.message)
  process.exit(1)
}
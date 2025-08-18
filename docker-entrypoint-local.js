#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'

const env = { ...process.env }

// Migrate database if running the web server
if (process.argv.slice(-3).join(' ') === 'yarn run start') {
  console.log('Running database migrations...')
  await exec('npx prisma migrate deploy')
  
  // Seed database if it's new
  const dbPath = process.env.DATABASE_PATH
  if (dbPath && !fs.existsSync(dbPath)) {
    console.log('Seeding new database...')
    await exec('tsx prisma/seed.ts')
  }
}

// Launch application
console.log('Starting application...')
await exec(process.argv.slice(2).join(' '))

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}
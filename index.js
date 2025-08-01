import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import sourceMapSupport from 'source-map-support'

sourceMapSupport.install({
	retrieveSourceMap: function (source) {
		// get source file without the `file://` prefix or `?t=...` suffix
		const match = source.match(/^file:\/\/(.*)\?t=[.\d]+$/)
		if (match) {
			return {
				url: source,
				map: fs.readFileSync(`${match[1]}.map`, 'utf8'),
			}
		}
		return null
	},
})

// Setup database for production
if (process.env.NODE_ENV === 'production') {
	console.log('🚀 Production mode - setting up database...')

	// Ensure data directory exists
	const dataDir = path.join(process.cwd(), 'data')
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true })
		console.log('📁 Created data directory')
	}

	// Check if database exists, if not run migrations
	const dbPath = path.join(dataDir, 'data.db')
	if (!fs.existsSync(dbPath)) {
		console.log('🗄️ Database not found, running migrations...')
		try {
			const { execSync } = await import('node:child_process')
			// Set DATABASE_URL for migration if not already set
			process.env.DATABASE_URL =
				process.env.DATABASE_URL || 'file:./data/data.db?connection_limit=1'
			execSync('npx prisma migrate deploy', {
				stdio: 'inherit',
				env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
			})
			console.log('✅ Database migrations complete')
		} catch (error) {
			console.error('⚠️ Migration failed:', error.message)
			console.log('⚠️ Continuing without migrations...')
		}
	} else {
		console.log('✅ Database already exists')
	}
}

if (process.env.MOCKS === 'true' && process.env.NODE_ENV !== 'production') {
	await import('./tests/mocks/index.ts')
}

if (process.env.NODE_ENV === 'production') {
	await import('./server-build/index.js')
} else {
	await import('./server/index.ts')
}

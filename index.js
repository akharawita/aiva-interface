import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
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

// Setup database for Railway production
if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT) {
	console.log('🚂 Railway detected - setting up database...')
	
	// Ensure data directory exists
	const dataDir = path.join(process.cwd(), 'data')
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true })
		console.log('📁 Created data directory')
	}
	
	// Check if database exists, if not run migrations
	const dbPath = path.join(dataDir, 'data.db')
	if (!fs.existsSync(dbPath)) {
		console.log('🗄️ Running database migrations...')
		try {
			execSync('npx prisma migrate deploy', { stdio: 'inherit' })
			console.log('✅ Database setup complete')
		} catch (error) {
			console.log('⚠️ Migration failed, continuing...')
		}
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

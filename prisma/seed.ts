import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
	console.log('🌱 Seeding...')
	
	// No seeding needed for planning poker - sessions are created dynamically
	// The database only stores completed sessions for historical purposes
	
	console.log('Database seeded successfully 🎉')
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
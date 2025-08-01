import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/reset-votes.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return Response.json({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		const body = await request.json() as { sessionCode: string; ownerName: string }
		const { sessionCode, ownerName } = body

		if (!sessionCode || !ownerName) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 })
		}

		const result = PlanningPokerSessionManager.resetVotes(
			sessionCode,
			ownerName
		)

		if (!result.success) {
			return Response.json({ error: result.error }, { status: 400 })
		}
		
		return Response.json({ success: true })
	} catch (error) {
		console.error('Error resetting votes:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}
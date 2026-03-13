import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/random-pick.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return Response.json({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		const body = (await request.json()) as {
			sessionCode: string
			ownerName: string
		}
		const { sessionCode, ownerName } = body

		if (!sessionCode || !ownerName) {
			return Response.json(
				{ error: 'Missing required fields' },
				{ status: 400 },
			)
		}

		const result = PlanningPokerSessionManager.randomPick(
			sessionCode,
			ownerName,
		)

		if (!result.success) {
			return Response.json({ error: result.error }, { status: 400 })
		}

		return Response.json({ success: true, picked: result.picked })
	} catch (error) {
		console.error('Error random picking:', error)
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}

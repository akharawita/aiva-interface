import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/kick-participant.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	try {
		const body = await request.json()
		const { sessionCode, ownerName, participantId } = body

		if (!sessionCode || !ownerName || !participantId) {
			throw new Response(
				JSON.stringify({ error: 'Missing required fields' }),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		const result = PlanningPokerSessionManager.kickParticipant(sessionCode, ownerName, participantId)

		if (!result.success) {
			throw new Response(
				JSON.stringify({ error: result.error }),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		return new Response(
			JSON.stringify({ success: true }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		)

	} catch (error) {
		console.error('Kick participant error:', error)
		
		if (error instanceof Response) {
			throw error
		}

		throw new Response(
			JSON.stringify({ error: 'Failed to kick participant' }),
			{ 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
}
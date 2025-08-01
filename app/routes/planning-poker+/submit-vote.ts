import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/submit-vote.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return Response.json({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		const body = await request.json() as { sessionCode: string; participantId: string; vote: string }
		const { sessionCode, participantId, vote } = body

		if (!sessionCode || !participantId || !vote) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 })
		}

		const result = PlanningPokerSessionManager.submitVote(
			sessionCode,
			participantId,
			vote
		)

		if (!result.success) {
			// Provide more specific status codes based on error type
			let statusCode = 400
			if (result.error === 'Session not found') {
				statusCode = 404
			} else if (result.error === 'Participant not found') {
				statusCode = 404
			}
			
			return Response.json({ 
				error: result.error,
				sessionCode: sessionCode.toUpperCase(),
				participantId 
			}, { status: statusCode })
		}
		
		return Response.json({ success: true })
	} catch (error) {
		console.error('Error submitting vote:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}
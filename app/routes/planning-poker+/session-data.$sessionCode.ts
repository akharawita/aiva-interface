import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/session-data.$sessionCode.ts'

export async function loader({ params }: Route.LoaderArgs) {
	const { sessionCode } = params

	if (!sessionCode) {
		throw new Response('Session code is required', { status: 400 })
	}

	const session = PlanningPokerSessionManager.getSession(
		sessionCode.toUpperCase(),
	)

	if (!session) {
		throw new Response('Session not found', { status: 404 })
	}

	// Return just the data that changes in real-time
	return Response.json({
		participants: session.participants,
		votes: session.votes,
		votesRevealed: session.votesRevealed,
		voteCount: Object.keys(session.votes).length,
		lastUpdated: Date.now(),
	})
}
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { sseConnections } from '#app/utils/sse-broadcaster.server.ts'
import { type Route } from './+types/sse.$sessionCode.ts'

export async function loader({ params, request }: Route.LoaderArgs) {
	const { sessionCode } = params

	if (!sessionCode) {
		throw new Response('Session code is required', { status: 400 })
	}

	const session = PlanningPokerSessionManager.getSession(sessionCode.toUpperCase())
	if (!session) {
		console.log(`SSE: Session ${sessionCode.toUpperCase()} not found or expired`)
		throw new Response(
			JSON.stringify({
				error: 'Session not found or expired',
				sessionCode: sessionCode.toUpperCase(),
				message: 'The session may have expired (sessions expire after 2 hours of inactivity), ended, or the code is incorrect'
			}), 
			{ 
				status: 404,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		)
	}

	console.log(`🔗 SSE connection established for session: ${sessionCode}`)

	// Create readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Add connection to session (store the controller directly)
			if (!sseConnections.has(sessionCode)) {
				sseConnections.set(sessionCode, new Set())
			}
			sseConnections.get(sessionCode)!.add(controller)

			console.log(`📊 SSE connections for ${sessionCode}:`, sseConnections.get(sessionCode)?.size || 0)

			// Send initial data
			const initialData = {
				participants: session.participants,
				votes: session.votes,
				votesRevealed: session.votesRevealed,
				isLocked: session.isLocked,
				voteCount: Object.keys(session.votes).length,
				timestamp: Date.now(),
			}

			const message = `data: ${JSON.stringify(initialData)}\n\n`
			controller.enqueue(new TextEncoder().encode(message))

			// Keep alive ping every 30 seconds
			const keepAlive = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode(': keepalive\n\n'))
				} catch (error) {
					console.log('SSE keepalive failed - connection closed')
					clearInterval(keepAlive)
				}
			}, 30000)

			// Handle connection close
			request.signal.addEventListener('abort', () => {
				console.log(`🔌 SSE connection closed for session: ${sessionCode}`)
				clearInterval(keepAlive)
				
				// Remove from connections
				const connections = sseConnections.get(sessionCode)
				if (connections) {
					connections.delete(controller)
					if (connections.size === 0) {
						sseConnections.delete(sessionCode)
					}
				}
				
				try {
					controller.close()
				} catch (error) {
					// Connection already closed
				}
			})
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control',
		},
	})
}

// Re-export the broadcaster function for compatibility
export { broadcastSSEUpdate } from '#app/utils/sse-broadcaster.server.ts'
// Global map to store SSE connections - shared between SSE route and broadcaster
export const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Function to broadcast updates to all connected SSE clients
export function broadcastSSEUpdate(sessionCode: string, data: any) {
	console.log(`🔥 broadcastSSEUpdate called for session: ${sessionCode} with data:`, data)
	console.log(`🔥 Available SSE connections:`, Array.from(sseConnections.keys()))
	console.log(`🔥 Connections for ${sessionCode}:`, sseConnections.get(sessionCode)?.size || 0)
	
	const connections = sseConnections.get(sessionCode)
	if (!connections || connections.size === 0) {
		console.log(`📡 No SSE connections to broadcast to for session: ${sessionCode}`)
		console.log(`📡 All connections:`, sseConnections.size, 'sessions total')
		return
	}

	console.log(`📡 Broadcasting SSE update to ${connections.size} connections for session: ${sessionCode}`)
	
	const message = `data: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`
	const encodedMessage = new TextEncoder().encode(message)

	// Send to all connections, remove dead ones
	const deadConnections = new Set()
	
	connections.forEach((controller) => {
		try {
			controller.enqueue(encodedMessage)
			console.log('✅ SSE message sent to controller')
		} catch (error) {
			console.log('SSE connection dead, removing...', error)
			deadConnections.add(controller)
		}
	})

	// Clean up dead connections
	deadConnections.forEach((controller) => connections.delete(controller))
	
	if (connections.size === 0) {
		sseConnections.delete(sessionCode)
	}
}
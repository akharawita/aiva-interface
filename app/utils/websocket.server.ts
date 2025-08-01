import { type Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { PlanningPokerSessionManager } from './planning-poker.server.ts'

export interface PlanningPokerWebSocketMessage {
	type: 
		| 'participant_joined' 
		| 'participant_left' 
		| 'session_locked' 
		| 'session_unlocked' 
		| 'story_added' 
		| 'voting_started' 
		| 'votes_revealed' 
		| 'session_completed'
		| 'vote_submitted'
		| 'votes_reset'
		| 'vote_count_updated'
	sessionCode: string
	data?: any
}

class WebSocketManager {
	private wss: WebSocketServer | null = null
	private connections = new Map<string, Set<WebSocket>>() // sessionCode -> Set of WebSocket connections

	initialize(server: Server) {
		this.wss = new WebSocketServer({ server, path: '/ws' })
		
		this.wss.on('connection', (ws: WebSocket, request) => {
			console.log('WebSocket connection established')
			
			ws.on('message', (message) => {
				try {
					const data = JSON.parse(message.toString())
					this.handleMessage(ws, data)
				} catch (error) {
					console.error('Invalid WebSocket message:', error)
				}
			})
			
			ws.on('close', () => {
				this.removeConnection(ws)
				console.log('WebSocket connection closed')
			})
			
			ws.on('error', (error) => {
				console.error('WebSocket error:', error)
				this.removeConnection(ws)
			})
		})
		
		console.log('WebSocket server initialized')
	}

	private handleMessage(ws: WebSocket, message: any) {
		console.log('📨 Received WebSocket message:', message)
		if (message.type === 'join_session' && message.sessionCode && message.participantName) {
			// Add WebSocket connection
			this.addConnection(message.sessionCode, ws)
			console.log(`👋 Client joined WebSocket session: ${message.sessionCode}`)
			console.log(`📊 Total connections for session ${message.sessionCode}:`, this.connections.get(message.sessionCode)?.size || 0)
			
			// Verify session exists using the same method as route loader
			const session = PlanningPokerSessionManager.getSession(message.sessionCode)
			if (session) {
				console.log(`✅ WebSocket verified session ${message.sessionCode} exists with ${session.participants.length} participants`)
				
				// Register participant in planning poker session with broadcasting enabled
				const result = PlanningPokerSessionManager.connectParticipantWebSocket(
					message.sessionCode,
					message.participantName,
					`ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
				)
				
				if (result.success) {
					console.log(`✅ Participant ${message.participantName} registered in planning poker session ${message.sessionCode}`)
				} else {
					console.log(`❌ Failed to register participant ${message.participantName} in session ${message.sessionCode}`)
				}
			} else {
				console.log(`❌ WebSocket could not find session ${message.sessionCode}`)
			}
		} else {
			console.log('❓ Unknown message type or missing required fields:', message)
		}
	}

	private addConnection(sessionCode: string, ws: WebSocket) {
		if (!this.connections.has(sessionCode)) {
			this.connections.set(sessionCode, new Set())
		}
		this.connections.get(sessionCode)!.add(ws)
	}

	private removeConnection(ws: WebSocket) {
		for (const [sessionCode, connections] of this.connections.entries()) {
			connections.delete(ws)
			if (connections.size === 0) {
				this.connections.delete(sessionCode)
			}
		}
	}

	broadcast(sessionCode: string, message: PlanningPokerWebSocketMessage) {
		const connections = this.connections.get(sessionCode)
		console.log(`🔥 Broadcasting ${message.type} to session ${sessionCode}: ${connections?.size || 0} connections`)
		
		if (!connections) {
			console.log(`❌ No connections found for session ${sessionCode}`)
			console.log(`Available sessions:`, Array.from(this.connections.keys()))
			return
		}

		const messageString = JSON.stringify(message)
		console.log(`📤 Sending message:`, message)
		
		connections.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(messageString)
					console.log(`Message sent to WebSocket connection`)
				} catch (error) {
					console.error('Error sending WebSocket message:', error)
					connections.delete(ws)
				}
			} else {
				console.log(`WebSocket connection not open, removing`)
				connections.delete(ws)
			}
		})

		// Clean up empty session
		if (connections.size === 0) {
			this.connections.delete(sessionCode)
		}
	}

	getConnectionCount(sessionCode: string): number {
		return this.connections.get(sessionCode)?.size || 0
	}

	getAllConnectionCounts(): Record<string, number> {
		const counts: Record<string, number> = {}
		for (const [sessionCode, connections] of this.connections.entries()) {
			counts[sessionCode] = connections.size
		}
		return counts
	}
}

export const webSocketManager = new WebSocketManager()

// Export types and utility functions

// Helper function to send real-time updates
export function broadcastToSession(sessionCode: string, message: PlanningPokerWebSocketMessage) {
	webSocketManager.broadcast(sessionCode, message)
}
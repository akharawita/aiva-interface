import { prisma } from './db.server.ts'
import { broadcastToSession } from './websocket.server.ts'
import { broadcastSSEUpdate } from './sse-broadcaster.server.ts'
import { addHours, isAfter } from 'date-fns'

export interface PlanningPokerParticipant {
	id: string
	name: string
	connectionId?: string
	joinedAt: Date
	isConnected: boolean
}

export interface PlanningPokerStory {
	id: string
	title: string
	description?: string
	status: 'pending' | 'voting' | 'completed'
	votes: Record<string, string> // participantId -> vote value
	finalEstimate?: string
	createdAt: Date
}

export interface PlanningPokerSession {
	sessionId: string
	sessionCode: string
	name: string
	description?: string
	ownerName: string
	status: 'active' | 'paused' | 'completed'
	isLocked: boolean
	createdAt: Date
	lastUpdated: Date // Track last activity for expiration
	participants: PlanningPokerParticipant[]
	stories: PlanningPokerStory[]
	currentStory?: string
	votingOpen: boolean
	connections: string[]
	votes: Record<string, string> // participantId -> vote value
	votesRevealed: boolean
}

// In-memory storage for active sessions
const activeSessions = new Map<string, PlanningPokerSession>()

// Session cleanup - remove inactive sessions after 24 hours
setInterval(() => {
	const now = new Date()
	const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
	
	for (const [code, session] of activeSessions.entries()) {
		if (session.createdAt < cutoff) {
			activeSessions.delete(code)
			console.log(`Cleaned up inactive session: ${code}`)
		}
	}
}, 60 * 60 * 1000) // Run every hour

function generateSessionCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateParticipantId(): string {
	return `participant_${Math.random().toString(36).substring(2, 9)}`
}

function generateStoryId(): string {
	return `story_${Math.random().toString(36).substring(2, 9)}`
}

function isSessionExpired(session: PlanningPokerSession): boolean {
	const expirationTime = addHours(session.lastUpdated, 2)
	return isAfter(new Date(), expirationTime)
}


export class PlanningPokerSessionManager {
	static createSession(data: {
		name: string
		description?: string
		ownerName: string
	}): PlanningPokerSession {
		let sessionCode: string
		do {
			sessionCode = generateSessionCode()
		} while (activeSessions.has(sessionCode))

		const now = new Date()
		const session: PlanningPokerSession = {
			sessionId: sessionCode,
			sessionCode,
			name: data.name,
			description: data.description,
			ownerName: data.ownerName,
			status: 'active',
			isLocked: false,
			createdAt: now,
			lastUpdated: now,
			participants: [],
			stories: [],
			votingOpen: false,
			connections: [],
			votes: {},
			votesRevealed: false,
		}

		activeSessions.set(sessionCode, session)
		console.log(`Created session: ${sessionCode} (expires 2h after last activity)`)
		console.log(`Active sessions:`, Array.from(activeSessions.keys()))
		return session
	}

	static getSession(sessionCode: string): PlanningPokerSession | null {
		console.log(`Looking for session: ${sessionCode}`)
		console.log(`Available sessions:`, Array.from(activeSessions.keys()))
		const session = activeSessions.get(sessionCode)
		
		if (!session) {
			console.log(`Session not found: ${sessionCode}`)
			return null
		}
		
		// Check if session has expired (2 hours after last update)
		if (isSessionExpired(session)) {
			const expirationTime = addHours(session.lastUpdated, 2)
			console.log(`Session expired: ${sessionCode} (last updated: ${session.lastUpdated.toISOString()}, expired at: ${expirationTime.toISOString()})`)
			// Remove expired session from memory
			activeSessions.delete(sessionCode)
			return null
		}
		
		console.log(`Found active session: ${sessionCode}`)
		return session
	}

	static joinSession(
		sessionCode: string,
		participantName: string,
		connectionId?: string,
		shouldBroadcast: boolean = true
	): { success: boolean; error?: string; participant?: PlanningPokerParticipant; isNewParticipant?: boolean } {
		console.log(`Joining session: ${sessionCode} with participant: ${participantName}, shouldBroadcast: ${shouldBroadcast}`)
		const session = activeSessions.get(sessionCode)
		if (!session) {
			console.log(`Session ${sessionCode} not found in joinSession`)
			return { success: false, error: 'Session not found' }
		}

		if (session.isLocked) {
			return { success: false, error: 'Session is locked' }
		}

		// Check if participant already exists by name
		let participant = session.participants.find(p => p.name === participantName)
		let isNewParticipant = false
		
		if (participant) {
			// Reconnecting participant
			participant.isConnected = true
			participant.connectionId = connectionId
			console.log(`Participant ${participantName} reconnected`)
		} else {
			// New participant
			participant = {
				id: generateParticipantId(),
				name: participantName,
				connectionId,
				joinedAt: new Date(),
				isConnected: true,
			}
			session.participants.push(participant)
			isNewParticipant = true
			console.log(`New participant ${participantName} added`)
		}

		if (connectionId && !session.connections.includes(connectionId)) {
			session.connections.push(connectionId)
		}

		// Update session activity timestamp
		session.lastUpdated = new Date()

		// Broadcast both WebSocket and SSE updates when a participant joins
		if (shouldBroadcast && isNewParticipant) {
			console.log(`Broadcasting participant joined: ${participant.name} to session ${sessionCode}`)
			
			// WebSocket broadcast (legacy)
			broadcastToSession(sessionCode, {
				type: 'participant_joined',
				sessionCode,
				data: {
					participant: {
						id: participant.id,
						name: participant.name,
						joinedAt: participant.joinedAt,
						isConnected: participant.isConnected,
					},
					participantCount: session.participants.length,
				},
			})

			// SSE broadcast for real-time updates
			console.log(`🔥 Broadcasting SSE participant joined: ${participant.name} in session ${sessionCode}`)
			broadcastSSEUpdate(sessionCode, {
				type: 'participant_joined',
				participants: session.participants,
				votes: session.votes,
				votesRevealed: session.votesRevealed,
				voteCount: Object.keys(session.votes).length,
				participantName: participant.name,
				participantCount: session.participants.length,
			})
		}

		return { success: true, participant, isNewParticipant }
	}

	static removeParticipant(sessionCode: string, participantId: string): boolean {
		const session = activeSessions.get(sessionCode)
		if (!session) return false

		const participantIndex = session.participants.findIndex(p => p.id === participantId)
		if (participantIndex === -1) return false

		const removedParticipant = session.participants[participantIndex]
		if (!removedParticipant) return false

		session.participants.splice(participantIndex, 1)
		session.lastUpdated = new Date() // Update activity timestamp

		// Remove participant's vote if they had one
		if (session.votes[participantId]) {
			delete session.votes[participantId]
		}

		// Broadcast participant left event via WebSocket (legacy)
		broadcastToSession(sessionCode, {
			type: 'participant_left',
			sessionCode,
			data: {
				participant: {
					id: removedParticipant.id,
					name: removedParticipant.name,
				},
				participantCount: session.participants.length,
			},
		})

		// Broadcast participant left event via SSE for real-time updates
		console.log(`🔥 Broadcasting SSE participant left: ${removedParticipant.name} in session ${sessionCode}`)
		broadcastSSEUpdate(sessionCode, {
			type: 'participant_left',
			participants: session.participants,
			votes: session.votes,
			votesRevealed: session.votesRevealed,
			voteCount: Object.keys(session.votes).length,
			participantName: removedParticipant.name,
			participantCount: session.participants.length,
		})

		return true
	}

	static leaveSession(sessionCode: string, participantId: string): { success: boolean; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		const participant = session.participants.find(p => p.id === participantId)
		if (!participant) {
			return { success: false, error: 'Participant not found' }
		}

		// Prevent owner from leaving (they should end the session instead)
		if (participant.name === session.ownerName) {
			return { success: false, error: 'Session owner cannot leave. Use "End Session" instead.' }
		}

		const removed = this.removeParticipant(sessionCode, participantId)
		if (removed) {
			console.log(`Participant ${participant.name} left session ${sessionCode}`)
			return { success: true }
		} else {
			return { success: false, error: 'Failed to remove participant' }
		}
	}

	static kickParticipant(sessionCode: string, ownerName: string, participantId: string): { success: boolean; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		if (session.ownerName !== ownerName) {
			return { success: false, error: 'Only session owner can kick participants' }
		}

		const participant = session.participants.find(p => p.id === participantId)
		if (!participant) {
			return { success: false, error: 'Participant not found' }
		}

		// Prevent owner from kicking themselves
		if (participant.name === session.ownerName) {
			return { success: false, error: 'Cannot kick session owner' }
		}

		const removed = this.removeParticipant(sessionCode, participantId)
		if (removed) {
			console.log(`Participant ${participant.name} was kicked from session ${sessionCode} by ${ownerName}`)
			return { success: true }
		} else {
			return { success: false, error: 'Failed to kick participant' }
		}
	}

	static toggleLock(sessionCode: string, ownerName: string): { success: boolean; isLocked?: boolean; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		if (session.ownerName !== ownerName) {
			return { success: false, error: 'Only session owner can lock/unlock' }
		}

		session.isLocked = !session.isLocked
		session.lastUpdated = new Date() // Update activity timestamp

		// Broadcast lock status change via WebSocket (legacy)
		broadcastToSession(sessionCode, {
			type: session.isLocked ? 'session_locked' : 'session_unlocked',
			sessionCode,
			data: {
				isLocked: session.isLocked,
			},
		})

		// Broadcast lock status change via SSE for real-time updates
		const lockType = session.isLocked ? 'session_locked' : 'session_unlocked'
		console.log(`🔥 Broadcasting SSE ${lockType} for session ${sessionCode}`)
		broadcastSSEUpdate(sessionCode, {
			type: lockType,
			participants: session.participants,
			votes: session.votes,
			votesRevealed: session.votesRevealed,
			voteCount: Object.keys(session.votes).length,
			isLocked: session.isLocked,
		})

		return { success: true, isLocked: session.isLocked }
	}


	static async completeSession(sessionCode: string, ownerName: string): Promise<{ success: boolean; error?: string }> {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		if (session.ownerName !== ownerName) {
			return { success: false, error: 'Only session owner can complete session' }
		}

		try {
			// First create the session
			const dbSession = await prisma.planningPokerSession.create({
				data: {
					sessionCode: session.sessionCode,
					name: session.name,
					description: session.description,
					ownerName: session.ownerName,
					status: 'completed',
					completedAt: new Date(),
				},
			})

			// Create participants
			const participantMap = new Map<string, string>() // memory ID -> DB ID
			for (const participant of session.participants) {
				const dbParticipant = await prisma.planningPokerParticipant.create({
					data: {
						name: participant.name,
						joinedAt: participant.joinedAt,
						sessionId: dbSession.id,
					},
				})
				participantMap.set(participant.id, dbParticipant.id)
			}

			// Create stories and votes
			for (const story of session.stories.filter(s => s.finalEstimate)) {
				const dbStory = await prisma.planningPokerStory.create({
					data: {
						title: story.title,
						description: story.description,
						finalEstimate: story.finalEstimate!,
						status: 'completed',
						sessionId: dbSession.id,
					},
				})

				// Create votes for this story
				for (const [participantId, value] of Object.entries(story.votes)) {
					const dbParticipantId = participantMap.get(participantId)
					if (dbParticipantId) {
						await prisma.planningPokerVote.create({
							data: {
								value,
								storyId: dbStory.id,
								participantId: dbParticipantId,
							},
						})
					}
				}
			}

			// Remove from memory
			activeSessions.delete(sessionCode)
			
			console.log(`Completed and archived session: ${sessionCode}`)
			return { success: true }
		} catch (error) {
			console.error('Error completing session:', error)
			return { success: false, error: 'Failed to save session data' }
		}
	}

	static connectParticipantWebSocket(
		sessionCode: string,
		participantName: string,
		connectionId: string
	): { success: boolean; isNewParticipant?: boolean } {
		console.log(`Connecting WebSocket for participant: ${participantName} in session: ${sessionCode}`)
		console.log(`Available sessions for WebSocket:`, Array.from(activeSessions.keys()))
		console.log(`Session map size:`, activeSessions.size)
		const session = activeSessions.get(sessionCode)
		if (!session) {
			console.log(`Session ${sessionCode} not found for WebSocket connection`)
			console.log(`Trying uppercase:`, activeSessions.get(sessionCode.toUpperCase()))
			return { success: false }
		}

		// Find existing participant
		let participant = session.participants.find(p => p.name === participantName)
		let isNewParticipant = false

		if (!participant) {
			// This is a new participant connecting via WebSocket (shouldn't happen in normal flow)
			participant = {
				id: generateParticipantId(),
				name: participantName,
				connectionId,
				joinedAt: new Date(),
				isConnected: true,
			}
			session.participants.push(participant)
			isNewParticipant = true
			console.log(`New participant ${participantName} added via WebSocket`)
		} else {
			// Update existing participant with connection info
			participant.connectionId = connectionId
			participant.isConnected = true
			console.log(`Existing participant ${participantName} connected via WebSocket`)
		}

		// Add connection to session
		if (!session.connections.includes(connectionId)) {
			session.connections.push(connectionId)
		}

		// Broadcast if this is a new participant
		if (isNewParticipant) {
			console.log(`Broadcasting new participant joined: ${participant.name}`)
			broadcastToSession(sessionCode, {
				type: 'participant_joined',
				sessionCode,
				data: {
					participant: {
						id: participant.id,
						name: participant.name,
						joinedAt: participant.joinedAt,
						isConnected: participant.isConnected,
					},
					participantCount: session.participants.length,
				},
			})
		}

		return { success: true, isNewParticipant }
	}

	static submitVote(
		sessionCode: string,
		participantId: string,
		vote: string
	): { success: boolean; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		const participant = session.participants.find(p => p.id === participantId)
		if (!participant) {
			return { success: false, error: 'Participant not found' }
		}

		// Prevent owner from voting
		if (participant.name === session.ownerName) {
			return { success: false, error: 'Session owners cannot vote' }
		}

		session.votes[participantId] = vote
		session.lastUpdated = new Date() // Update activity timestamp
		console.log(`🗳️ Vote submitted: ${participant.name} voted ${vote} in session ${sessionCode}`)
		console.log(`🗳️ Session votes after update:`, session.votes)
		console.log(`🗳️ Vote count:`, Object.keys(session.votes).length)

		// Broadcast WebSocket event (legacy)
		console.log(`🚀 Broadcasting vote_submitted for ${participant.name} in session ${sessionCode}`)
		broadcastToSession(sessionCode, {
			type: 'vote_submitted',
			sessionCode,
			data: {
				participantId,
				participantName: participant.name,
				hasVoted: true,
				voteCount: Object.keys(session.votes).length,
				totalParticipants: session.participants.length,
			},
		})

		// Broadcast SSE update
		console.log(`🔥 About to call broadcastSSEUpdate for session: ${sessionCode}`)
		broadcastSSEUpdate(sessionCode, {
			type: 'vote_submitted',
			participants: session.participants,
			votes: session.votes,
			votesRevealed: session.votesRevealed,
			voteCount: Object.keys(session.votes).length,
			participantName: participant.name,
		})
		console.log(`🔥 broadcastSSEUpdate call completed`)

		return { success: true }
	}

	static resetVotes(
		sessionCode: string,
		ownerName: string
	): { success: boolean; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		if (session.ownerName !== ownerName) {
			return { success: false, error: 'Only session owner can reset votes' }
		}

		session.votes = {}
		session.votesRevealed = false
		session.lastUpdated = new Date() // Update activity timestamp
		console.log(`Votes reset by ${ownerName} in session ${sessionCode}`)

		// Broadcast WebSocket event (legacy)
		broadcastToSession(sessionCode, {
			type: 'votes_reset',
			sessionCode,
			data: {
				voteCount: 0,
				totalParticipants: session.participants.length,
				votesRevealed: false,
			},
		})

		// Broadcast SSE update
		broadcastSSEUpdate(sessionCode, {
			type: 'votes_reset',
			participants: session.participants,
			votes: session.votes,
			votesRevealed: session.votesRevealed,
			voteCount: 0,
		})

		return { success: true }
	}

	static revealVotes(
		sessionCode: string,
		ownerName: string
	): { success: boolean; votes?: Array<{participantId: string; participantName: string; vote: string}>; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		if (session.ownerName !== ownerName) {
			return { success: false, error: 'Only session owner can reveal votes' }
		}

		session.votesRevealed = true
		session.lastUpdated = new Date() // Update activity timestamp

		// Convert votes to include participant names
		const votesWithNames = Object.entries(session.votes).map(([participantId, vote]) => {
			const participant = session.participants.find(p => p.id === participantId)
			return {
				participantId,
				participantName: participant?.name || 'Unknown',
				vote
			}
		})

		console.log(`Votes revealed by ${ownerName} in session ${sessionCode}`)

		// Broadcast WebSocket event (legacy)
		broadcastToSession(sessionCode, {
			type: 'votes_revealed',
			sessionCode,
			data: {
				votes: votesWithNames,
				votesRevealed: true,
			},
		})

		// Broadcast SSE update
		broadcastSSEUpdate(sessionCode, {
			type: 'votes_revealed',
			participants: session.participants,
			votes: session.votes,
			votesRevealed: session.votesRevealed,
			voteCount: Object.keys(session.votes).length,
			revealedVotes: votesWithNames,
		})

		return { success: true, votes: votesWithNames }
	}

	static getVotes(sessionCode: string): { success: boolean; votes?: Record<string, string>; error?: string } {
		const session = activeSessions.get(sessionCode)
		if (!session) {
			return { success: false, error: 'Session not found' }
		}

		return { success: true, votes: session.votes }
	}

	static getAllActiveSessions(): PlanningPokerSession[] {
		return Array.from(activeSessions.values())
	}

	static getSessionCount(): number {
		return activeSessions.size
	}

	static getAllSessions(): PlanningPokerSession[] {
		return Array.from(activeSessions.values()).sort((a, b) => 
			new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
		)
	}
}
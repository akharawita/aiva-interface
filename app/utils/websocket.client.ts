import { useEffect, useRef, useState } from 'react'

export interface PlanningPokerWebSocketMessage {
	type: 'participant_joined' | 'participant_left' | 'session_locked' | 'session_unlocked' | 'story_added' | 'voting_started' | 'votes_revealed' | 'session_completed'
	sessionCode: string
	data?: any
}

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function usePlanningPokerWebSocket(sessionCode: string) {
	const [status, setStatus] = useState<WebSocketStatus>('disconnected')
	const [lastMessage, setLastMessage] = useState<PlanningPokerWebSocketMessage | null>(null)
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const maxReconnectAttempts = 5
	const [isClient, setIsClient] = useState(false)

	// Set client flag after hydration
	useEffect(() => {
		setIsClient(true)
	}, [])

	const connect = () => {
		// Only run on client side
		if (!isClient || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
			return
		}

		if (wsRef.current?.readyState === 1) { // WebSocket.OPEN = 1
			return // Already connected
		}

		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const wsUrl = `${protocol}//${window.location.host}/ws`
			
			console.log('Connecting to WebSocket:', wsUrl)
			wsRef.current = new WebSocket(wsUrl)
			setStatus('connecting')

			wsRef.current.onopen = () => {
				console.log('WebSocket connected successfully')
				setStatus('connected')
				reconnectAttemptsRef.current = 0
				
				// Join the session - we'll handle participant info from the session page
				if (wsRef.current?.readyState === 1) { // WebSocket.OPEN = 1
					console.log('Sending join_session message for:', sessionCode)
					wsRef.current.send(JSON.stringify({
						type: 'join_session',
						sessionCode: sessionCode,
					}))
				}
			}

			wsRef.current.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data) as PlanningPokerWebSocketMessage
					console.log('Received WebSocket message:', message)
					setLastMessage(message)
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error)
				}
			}

			wsRef.current.onclose = (event) => {
				setStatus('disconnected')
				
				// Attempt to reconnect if not a manual close
				if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectAttemptsRef.current++
						connect()
					}, delay)
				}
			}

			wsRef.current.onerror = (error) => {
				console.error('WebSocket error:', error)
				setStatus('error')
			}

		} catch (error) {
			console.error('Failed to create WebSocket connection:', error)
			setStatus('error')
		}
	}

	const disconnect = () => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}
		
		if (wsRef.current) {
			wsRef.current.close(1000, 'Manual disconnect')
			wsRef.current = null
		}
		
		setStatus('disconnected')
	}

	// Connect on mount and when sessionCode changes (only on client)
	useEffect(() => {
		if (isClient && sessionCode) {
			connect()
		}

		return () => {
			disconnect()
		}
	}, [sessionCode, isClient])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			disconnect()
		}
	}, [])

	return {
		status,
		lastMessage,
		connect,
		disconnect,
		isConnected: status === 'connected',
	}
}

// Custom hook for handling specific message types
export function usePlanningPokerEvents(sessionCode: string) {
	const { status, lastMessage, isConnected } = usePlanningPokerWebSocket(sessionCode)
	const [participants, setParticipants] = useState<any[]>([])
	const [isLocked, setIsLocked] = useState(false)

	useEffect(() => {
		if (!lastMessage) return

		console.log('Processing WebSocket message:', lastMessage.type, lastMessage.data)

		switch (lastMessage.type) {
			case 'participant_joined':
				console.log('Adding participant:', lastMessage.data.participant)
				setParticipants(prev => {
					// Check if participant already exists
					const existingIndex = prev.findIndex(p => p.id === lastMessage.data.participant.id)
					if (existingIndex >= 0) {
						// Update existing participant
						const updated = [...prev]
						updated[existingIndex] = { ...updated[existingIndex], ...lastMessage.data.participant }
						console.log('Updated existing participant, new list:', updated)
						return updated
					} else {
						// Add new participant
						const newList = [...prev, lastMessage.data.participant]
						console.log('Added new participant, new list:', newList)
						return newList
					}
				})
				break

			case 'participant_left':
				console.log('Removing participant:', lastMessage.data.participant)
				setParticipants(prev => 
					prev.filter(p => p.id !== lastMessage.data.participant.id)
				)
				break

			case 'session_locked':
				console.log('Session locked')
				setIsLocked(true)
				break

			case 'session_unlocked':
				console.log('Session unlocked')
				setIsLocked(false)
				break
		}
	}, [lastMessage])

	return {
		status,
		isConnected,
		participants,
		isLocked,
		lastMessage,
	}
}
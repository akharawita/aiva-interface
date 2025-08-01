import { useEffect, useRef, useState } from 'react'

export interface WebSocketMessage {
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

interface UseWebSocketOptions {
	sessionCode: string
	participantName: string
	onMessage?: (message: WebSocketMessage) => void
}

export function useWebSocket({ sessionCode, participantName, onMessage }: UseWebSocketOptions) {
	const [isConnected, setIsConnected] = useState(false)
	const [connectionError, setConnectionError] = useState<string | null>(null)
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttempts = useRef(0)
	const maxReconnectAttempts = 5

	const connect = () => {
		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const wsUrl = `${protocol}//${window.location.host}/ws`
			
			console.log('🔗 Attempting WebSocket connection to:', wsUrl)
			const ws = new WebSocket(wsUrl)
			wsRef.current = ws

			ws.onopen = () => {
				console.log('✅ WebSocket connected successfully!')
				setIsConnected(true)
				setConnectionError(null)
				reconnectAttempts.current = 0

				// Join the session
				const joinMessage = {
					type: 'join_session',
					sessionCode,
					participantName,
				}
				console.log('📤 Sending join message:', joinMessage)
				ws.send(JSON.stringify(joinMessage))
			}

			ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data)
					console.log('🔄 WebSocket received:', message.type, message.data)
					onMessage?.(message)
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error)
				}
			}

			ws.onclose = (event) => {
				console.log('WebSocket disconnected:', event.code, event.reason)
				setIsConnected(false)
				wsRef.current = null

				// Attempt to reconnect if not intentionally closed
				if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
					const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
					console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`)
					
					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectAttempts.current++
						connect()
					}, delay)
				} else if (reconnectAttempts.current >= maxReconnectAttempts) {
					setConnectionError('Failed to reconnect after multiple attempts')
				}
			}

			ws.onerror = (error) => {
				console.error('❌ WebSocket error:', error)
				setConnectionError(`WebSocket connection error: ${error}`)
			}

		} catch (error) {
			console.error('Failed to create WebSocket connection:', error)
			setConnectionError('Failed to create WebSocket connection')
		}
	}

	const disconnect = () => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (wsRef.current) {
			wsRef.current.close(1000, 'Intentional disconnect')
			wsRef.current = null
		}
	}

	const sendMessage = (message: any) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message))
		} else {
			console.warn('WebSocket is not connected. Cannot send message:', message)
		}
	}

	useEffect(() => {
		connect()

		return () => {
			disconnect()
		}
	}, [sessionCode, participantName])

	return {
		isConnected,
		connectionError,
		sendMessage,
		reconnect: connect,
		disconnect,
	}
}
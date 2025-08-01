import { useEffect, useState } from 'react'

interface UseSSEOptions {
	url: string
	enabled: boolean
}

export function useSSE<T>({ url, enabled }: UseSSEOptions) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [lastUpdated, setLastUpdated] = useState<number>(0)

	useEffect(() => {
		if (!enabled) {
			setIsConnected(false)
			return
		}

		console.log('🔗 Connecting to SSE:', url)
		let eventSource: EventSource | null = null
		let reconnectTimeout: NodeJS.Timeout | null = null

		const connect = () => {
			try {
				eventSource = new EventSource(url)

				eventSource.onopen = () => {
					console.log('✅ SSE connected')
					setIsConnected(true)
					setError(null)
				}

				eventSource.onmessage = (event) => {
					try {
						const newData = JSON.parse(event.data)
						console.log('📨 SSE data received:', newData.type || 'update')
						setData(newData)
						setLastUpdated(Date.now())
					} catch (parseError) {
						console.error('SSE data parse error:', parseError)
						setError('Invalid data received')
					}
				}

				eventSource.onerror = (event) => {
					console.error('❌ SSE error:', event)
					setIsConnected(false)

					if (eventSource?.readyState === EventSource.CLOSED) {
						setError('Connection closed')

						// Don't attempt to reconnect if we got a 404 (session not found)
						// Check if the last response was a 404
						fetch(url, { method: 'HEAD' })
							.then(response => {
								if (response.status === 404) {
									console.log('🚫 Session not found - stopping reconnection attempts')
									setError('Session not found')
									return
								}
								
								// Attempt to reconnect after 3 seconds for other errors
								reconnectTimeout = setTimeout(() => {
									console.log('🔄 Attempting SSE reconnection...')
									connect()
								}, 3000)
							})
							.catch(() => {
								// If HEAD request fails, try reconnecting anyway
								reconnectTimeout = setTimeout(() => {
									console.log('🔄 Attempting SSE reconnection...')
									connect()
								}, 3000)
							})
					} else {
						setError('Connection error')
					}
				}
			} catch (connectError) {
				console.error('Failed to create SSE connection:', connectError)
				setError('Failed to connect')
				setIsConnected(false)
			}
		}

		connect()

		return () => {
			console.log('🔌 Closing SSE connection')
			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout)
			}
			if (eventSource) {
				eventSource.close()
			}
			setIsConnected(false)
		}
	}, [url, enabled])

	return {
		data,
		error,
		isConnected,
		lastUpdated,
		connectionError: error,
	}
}

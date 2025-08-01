import { useEffect, useState } from 'react'

interface UsePollingOptions {
	url: string
	interval: number
	enabled: boolean
}

export function usePolling<T>({ url, interval, enabled }: UsePollingOptions) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdated, setLastUpdated] = useState<number>(0)

	useEffect(() => {
		if (!enabled) return

		let timeoutId: NodeJS.Timeout

		const poll = async () => {
			try {
				const response = await fetch(url)
				if (response.ok) {
					const newData = await response.json()
					setData(newData)
					setError(null)
					setLastUpdated(Date.now())
				} else {
					setError(`HTTP ${response.status}`)
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error')
			}

			if (enabled) {
				timeoutId = setTimeout(poll, interval)
			}
		}

		// Start polling immediately
		poll()

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	}, [url, interval, enabled])

	return { data, error, lastUpdated }
}
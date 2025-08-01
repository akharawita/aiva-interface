export async function loader() {
	try {
		// Simple health check without dependencies
		return new Response('OK', {
			status: 200,
			headers: {
				'Content-Type': 'text/plain',
				'Cache-Control': 'no-cache',
			},
		})
	} catch (error) {
		console.error('Health check error:', error)
		return new Response('ERROR', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		})
	}
}
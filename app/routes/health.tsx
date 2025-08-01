import { type Route } from './+types/health.ts'

export async function loader({ request }: Route.LoaderArgs) {
	// Simple health check
	return new Response('OK', {
		status: 200,
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'no-cache',
		},
	})
}
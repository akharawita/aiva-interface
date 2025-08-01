import { data } from 'react-router'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/toggle-lock.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const body = await request.json()
	const { sessionCode, ownerName } = body as {
		sessionCode: string
		ownerName: string
	}

	if (!sessionCode || !ownerName) {
		return data({ success: false, error: 'Missing required fields' }, { status: 400 })
	}

	const result = PlanningPokerSessionManager.toggleLock(sessionCode, ownerName)

	if (!result.success) {
		return data({ success: false, error: result.error }, { status: 400 })
	}

	return data({ success: true, isLocked: result.isLocked })
}
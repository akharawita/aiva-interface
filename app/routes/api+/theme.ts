import { type Route } from './+types/theme.ts'
import { setTheme } from '#app/utils/theme.server.ts'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const theme = formData.get('theme')
	
	if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
		return new Response('Invalid theme', { status: 400 })
	}
	
	return new Response(null, {
		headers: {
			'Set-Cookie': setTheme(theme),
		},
	})
}
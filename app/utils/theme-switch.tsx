import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { type Theme } from './theme.server.ts'

export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: Theme | null
}) {
	const fetcher = useFetcher()
	
	const mode = userPreference ?? 'system'
	const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
	const iconName = mode === 'system' ? 'laptop' : mode === 'light' ? 'sun' : 'moon'

	return (
		<fetcher.Form method="POST" action="/api/theme">
			<input type="hidden" name="theme" value={nextMode} />
			<Button variant="ghost" size="icon" type="submit">
				<Icon name={iconName} className="h-5 w-5" />
				<span className="sr-only">Toggle theme</span>
			</Button>
		</fetcher.Form>
	)
}

export function useTheme() {
	if (typeof document === 'undefined') return 'light' // SSR fallback
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
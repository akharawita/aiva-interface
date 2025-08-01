import {
	data,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from 'react-router'
import { type Route } from './+types/root.ts'
import faviconAssetUrl from './assets/favicons/favicon.svg'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import { ThemeSwitch, useTheme } from './utils/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { getEnv } from './utils/env.server.ts'
import { pipeHeaders } from './utils/headers.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { type Theme, getTheme } from './utils/theme.server.ts'
import { makeTimings } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: Route.LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		{
			rel: 'icon',
			href: '/favicon.ico',
			sizes: '48x48',
		},
		{ rel: 'icon', type: 'image/svg+xml', href: faviconAssetUrl },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: Route.MetaFunction = ({ data }) => {
	return [
		{ title: data ? 'Planning Poker' : 'Error | Planning Poker' },
		{ name: 'description', content: `Agile estimation tool for scrum teams` },
	]
}

export async function loader({ request }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const { toast, headers: toastHeaders } = await getToast(request)

	return data(
		{
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}

export const headers: Route.HeadersFunction = pipeHeaders

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string | undefined>
}) {
	const allowIndexing = ENV.ALLOW_INDEXING !== 'false'
	return (
		<html lang="en" className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

export function Layout({ children }: { children: React.ReactNode }) {
	const data = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = data?.requestInfo.userPrefs.theme ?? 'light'
	return (
		<Document nonce={nonce} theme={theme} env={data?.ENV}>
			{children}
		</Document>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const theme = useTheme()
	useToast(data.toast)

	return (
		<div className="flex min-h-screen flex-col justify-between">
			<header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
				<div className="container py-4">
					<nav className="flex items-center justify-between gap-4">
						<Link to="/" className="group flex items-center gap-2">
							<span className="text-3xl">🎯</span>
							<span className="font-bold text-xl">Planning Poker</span>
						</Link>
						<ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} />
					</nav>
				</div>
			</header>

			<div className="flex flex-1 flex-col">
				<Outlet />
			</div>

			<footer className="border-t bg-muted/30 mt-auto">
				<div className="container py-6">
					<p className="text-center text-sm text-muted-foreground">
						© 2024 Planning Poker. All rights reserved.
					</p>
				</div>
			</footer>

			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</div>
	)
}

export default App

export const ErrorBoundary = GeneralErrorBoundary
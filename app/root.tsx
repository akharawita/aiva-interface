import { OpenImgContextProvider } from 'openimg/react'
import {
	data,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useLocation,
	useMatches,
} from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { type Route } from './+types/root.ts'
import appleTouchIconAssetUrl from './assets/favicons/apple-touch-icon.png'
import faviconAssetUrl from './assets/favicons/favicon.svg'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { SearchBar } from './components/search-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { Button } from './components/ui/button.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import { UserDropdown } from './components/user-dropdown.tsx'
import {
	ThemeSwitch,
	useOptionalTheme,
	useTheme,
} from './routes/resources+/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { pipeHeaders } from './utils/headers.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl, getImgSrc } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { type Theme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { useOptionalUser } from './utils/user.ts'

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
		{ rel: 'apple-touch-icon', href: appleTouchIconAssetUrl },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: Route.MetaFunction = ({ data }) => {
	return [
		{ title: data ? 'Epic Notes' : 'Error | Epic Notes' },
		{ name: 'description', content: `Your own captain's log` },
	]
}

export async function loader({ request }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUnique({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { objectKey: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = await honeypot.getInputProps()

	return data(
		{
			user,
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
			honeyProps,
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
	// if there was an error running the loader, data could be missing
	const data = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = useOptionalTheme()
	return (
		<Document nonce={nonce} theme={theme} env={data?.ENV}>
			{children}
		</Document>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const theme = useTheme()
	const location = useLocation()
	const matches = useMatches()
	const isOnSearchPage = matches.find((m) => m.id === 'routes/users+/index')
	const isPlanningPokerPage = location.pathname.startsWith('/planning-poker')
	const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />
	useToast(data.toast)

	return (
		<OpenImgContextProvider
			optimizerEndpoint="/resources/images"
			getSrc={getImgSrc}
		>
			<div className="flex min-h-screen flex-col justify-between">
				{!isPlanningPokerPage && (
					<header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
						<div className="container py-4">
							<nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
								<Logo />
								<div className="ml-auto hidden max-w-sm flex-1 sm:block">
									{searchBar}
								</div>
								<div className="flex items-center gap-6">
									<Link
										to="/planning-poker"
										className="group flex items-center gap-2 text-foreground hover:text-primary font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary/10"
										title="Planning Poker Game - Agile Estimation Tool"
									>
										<span className="text-lg group-hover:scale-110 transition-transform">🎯</span>
										<span>Planning Poker Game</span>
									</Link>
									{user && (
										<Link
											to="/admin"
											className="group flex items-center gap-2 text-foreground hover:text-primary font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary/10"
											title="Admin Dashboard"
										>
											<span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
											<span>Admin</span>
										</Link>
									)}
									{user ? (
										<UserDropdown />
									) : (
										<Button asChild variant="default" size="lg" className="rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg">
											<Link to="/login">Log In</Link>
										</Button>
									)}
								</div>
								<div className="block w-full sm:hidden">{searchBar}</div>
							</nav>
						</div>
					</header>
				)}

				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>

				<footer className="border-t bg-gradient-to-r from-muted/30 to-muted/50 mt-auto">
					<div className="container py-8">
						<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
							<div className="flex flex-col gap-4">
								<Logo />
								<p className="text-sm text-muted-foreground max-w-md">
									A modern platform for collaborative planning poker games, agile estimation, scrum poker cards, and team-based story point estimation.
								</p>
							</div>
							<div className="flex flex-col gap-4 md:items-end">
								<div className="flex items-center gap-4">
									<Link
										to="/planning-poker"
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
										title="Planning Poker Game"
									>
										Planning Poker Game
									</Link>
									<Link
										to="/about"
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										About
									</Link>
									<Link
										to="/support"
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										Support
									</Link>
								</div>
								<div className="flex items-center gap-4">
									<ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} />
									<p className="text-xs text-muted-foreground">
										© 2024 Epic Notes. All rights reserved.
									</p>
								</div>
							</div>
						</div>
					</div>
				</footer>
			</div>
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</OpenImgContextProvider>
	)
}

function Logo() {
	return (
		<Link to="/" className="group flex items-center gap-2">
			<div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
				<span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">E</span>
			</div>
			<div className="grid leading-tight">
				<span className="font-light text-lg transition group-hover:-translate-x-1">
					epic
				</span>
				<span className="font-bold text-lg transition group-hover:translate-x-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
					notes
				</span>
			</div>
		</Link>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	)
}

export default AppWithProviders

// this is a last resort error boundary. There's not much useful information we
// can offer at this level.
export const ErrorBoundary = GeneralErrorBoundary

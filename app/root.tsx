import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'

export const links = () => {
	return [
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	]
}

export default function App() {
	return (
		<html lang="en">
			<head>
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body>
				<div className="min-h-screen p-8">
					<h1 className="text-2xl font-bold mb-4">🎯 Planning Poker</h1>
					<Outlet />
				</div>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}
import { data, Link, useLoaderData } from 'react-router'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { type Route } from './+types/sessions.ts'

export async function loader({ request }: Route.LoaderArgs) {
	// TODO: Add admin authentication check here
	// For now, we'll allow access for development
	
	const sessions = PlanningPokerSessionManager.getAllSessions()
	
	return data({
		sessions,
		totalSessions: sessions.length,
		activeSessions: sessions.filter(s => s.status === 'active').length,
		completedSessions: sessions.filter(s => s.status === 'completed').length,
	})
}

export const meta: Route.MetaFunction = () => [
	{ title: 'Admin - Planning Poker Sessions' },
	{ name: 'description', content: 'Administrative dashboard for managing planning poker sessions' },
]

export default function AdminPlanningPokerSessions() {
	const { sessions, totalSessions, activeSessions, completedSessions } = useLoaderData<typeof loader>()

	const formatDuration = (created: Date, lastUpdated: Date) => {
		const duration = lastUpdated.getTime() - created.getTime()
		const minutes = Math.floor(duration / (1000 * 60))
		const hours = Math.floor(minutes / 60)
		
		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`
		}
		return `${minutes}m`
	}

	const getStatusBadge = (session: any) => {
		if (session.status === 'completed') {
			return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Completed</span>
		}
		if (session.isLocked) {
			return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🔒 Locked</span>
		}
		return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-7xl">
				{/* Back Button */}
				<div className="mb-6">
					<Link
						to="/admin"
						className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
					>
						← Back to Admin Dashboard
					</Link>
				</div>

				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">Planning Poker Sessions</h1>
					<p className="text-muted-foreground">Administrative overview of all planning poker sessions</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-card rounded-lg border p-6">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
									<span className="text-blue-600 text-sm font-semibold">{totalSessions}</span>
								</div>
							</div>
							<div className="ml-4">
								<h3 className="text-sm font-medium text-muted-foreground">Total Sessions</h3>
								<p className="text-2xl font-bold text-foreground">{totalSessions}</p>
							</div>
						</div>
					</div>

					<div className="bg-card rounded-lg border p-6">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
									<span className="text-green-600 text-sm font-semibold">{activeSessions}</span>
								</div>
							</div>
							<div className="ml-4">
								<h3 className="text-sm font-medium text-muted-foreground">Active Sessions</h3>
								<p className="text-2xl font-bold text-foreground">{activeSessions}</p>
							</div>
						</div>
					</div>

					<div className="bg-card rounded-lg border p-6">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
									<span className="text-gray-600 text-sm font-semibold">{completedSessions}</span>
								</div>
							</div>
							<div className="ml-4">
								<h3 className="text-sm font-medium text-muted-foreground">Completed Sessions</h3>
								<p className="text-2xl font-bold text-foreground">{completedSessions}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Sessions Table */}
				<div className="bg-card rounded-lg border overflow-hidden">
					<div className="px-6 py-4 border-b">
						<h2 className="text-lg font-semibold text-foreground">All Sessions</h2>
					</div>
					
					{sessions.length === 0 ? (
						<div className="px-6 py-12 text-center">
							<div className="text-muted-foreground">
								<span className="text-4xl mb-4 block">🎯</span>
								<p className="text-lg font-medium mb-2">No sessions found</p>
								<p className="text-sm">Planning poker sessions will appear here when created</p>
							</div>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-border">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Session
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Owner
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Participants
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Duration
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Votes
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Created
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{sessions.map((session) => (
										<tr key={session.sessionCode} className="hover:bg-muted/30">
											<td className="px-6 py-4 whitespace-nowrap">
												<div>
													<div className="text-sm font-medium text-foreground">
														{session.name}
													</div>
													<div className="text-sm text-muted-foreground font-mono">
														{session.sessionCode}
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-foreground">{session.ownerName}</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-foreground">
													{session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}
												</div>
												<div className="text-xs text-muted-foreground">
													{session.participants.filter(p => p.isConnected).length} connected
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{getStatusBadge(session)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
												{formatDuration(new Date(session.createdAt), new Date(session.lastUpdated))}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-foreground">
													{Object.keys(session.votes).length} vote{Object.keys(session.votes).length !== 1 ? 's' : ''}
												</div>
												<div className="text-xs text-muted-foreground">
													{session.votesRevealed ? 'Revealed' : 'Hidden'}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
												{new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
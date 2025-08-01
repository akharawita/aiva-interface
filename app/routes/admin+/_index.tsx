import { Link } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { type Route } from './+types/_index.ts'

export const meta: Route.MetaFunction = () => [
	{ title: 'Admin Dashboard' },
	{ name: 'description', content: 'Administrative dashboard for managing the platform' },
]

export default function AdminIndex() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-4xl">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
					<p className="text-muted-foreground">Platform administration and management tools</p>
				</div>

				{/* Admin Cards */}
				<div className="grid md:grid-cols-2 gap-6">
					<div className="bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<div className="mb-4">
							<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
								<span className="text-2xl">🎯</span>
							</div>
							<h2 className="text-xl font-semibold mb-2">Planning Poker Sessions</h2>
							<p className="text-muted-foreground text-sm">
								Monitor and manage all planning poker sessions across the platform. 
								View active sessions, participant counts, and session analytics.
							</p>
						</div>
						<Button asChild className="w-full">
							<Link to="/admin/planning-poker/sessions">
								View Sessions
							</Link>
						</Button>
					</div>

					<div className="bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow opacity-50">
						<div className="mb-4">
							<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
								<span className="text-2xl">👥</span>
							</div>
							<h2 className="text-xl font-semibold mb-2">User Management</h2>
							<p className="text-muted-foreground text-sm">
								Manage user accounts, permissions, and access controls. 
								View user activity and handle account-related issues.
							</p>
						</div>
						<Button disabled className="w-full">
							Coming Soon
						</Button>
					</div>

					<div className="bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow opacity-50">
						<div className="mb-4">
							<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
								<span className="text-2xl">📊</span>
							</div>
							<h2 className="text-xl font-semibold mb-2">Analytics</h2>
							<p className="text-muted-foreground text-sm">
								View platform usage statistics, user engagement metrics, 
								and performance analytics to inform business decisions.
							</p>
						</div>
						<Button disabled className="w-full">
							Coming Soon
						</Button>
					</div>

					<div className="bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow opacity-50">
						<div className="mb-4">
							<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
								<span className="text-2xl">⚙️</span>
							</div>
							<h2 className="text-xl font-semibold mb-2">System Settings</h2>
							<p className="text-muted-foreground text-sm">
								Configure platform settings, manage system preferences, 
								and handle maintenance tasks and configurations.
							</p>
						</div>
						<Button disabled className="w-full">
							Coming Soon
						</Button>
					</div>
				</div>

				{/* Quick Stats */}
				<div className="mt-12 bg-muted/30 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
						<div>
							<div className="text-2xl font-bold text-primary">Active</div>
							<div className="text-sm text-muted-foreground">Planning Poker Sessions</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-secondary">Users</div>
							<div className="text-sm text-muted-foreground">Registered Users</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-foreground">Today</div>
							<div className="text-sm text-muted-foreground">Sessions Created</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-foreground">Online</div>
							<div className="text-sm text-muted-foreground">Connected Users</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
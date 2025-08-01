import { Button } from '#app/components/ui/button.tsx'
import { Link } from 'react-router'

interface SessionErrorBoundaryProps {
	error?: {
		type: 'not_found' | 'expired' | 'generic'
		sessionCode?: string
		message?: string
	}
}

export function SessionErrorBoundary({ error }: SessionErrorBoundaryProps) {
	const getErrorContent = () => {
		if (!error) {
			return {
				icon: '❌',
				title: 'Something went wrong',
				message: 'An unexpected error occurred.',
				color: 'text-red-600'
			}
		}

		switch (error.type) {
			case 'not_found':
				return {
					icon: '🔍',
					title: 'Session Not Found',
					message: `Session "${error.sessionCode}" could not be found. The session code may be incorrect or the session may have been deleted.`,
					color: 'text-orange-600'
				}
			case 'expired':
				return {
					icon: '⏰',
					title: 'Session Expired',
					message: `Session "${error.sessionCode}" has expired. Sessions automatically expire after 2 hours of inactivity to keep things organized.`,
					color: 'text-amber-600'
				}
			default:
				return {
					icon: '❌',
					title: 'Session Error',
					message: error.message || 'An error occurred while accessing the session.',
					color: 'text-red-600'
				}
		}
	}

	const { icon, title, message, color } = getErrorContent()

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				{/* Error Card */}
				<div className="bg-card border border-border rounded-xl shadow-lg p-8 text-center space-y-6">
					{/* Icon */}
					<div className="flex justify-center">
						<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-3xl">
							{icon}
						</div>
					</div>

					{/* Title */}
					<div>
						<h1 className={`text-2xl font-bold ${color} mb-2`}>
							{title}
						</h1>
						<p className="text-muted-foreground leading-relaxed">
							{message}
						</p>
					</div>

					{/* Session Code Display */}
					{error?.sessionCode && (
						<div className="bg-muted rounded-lg p-4">
							<p className="text-sm text-muted-foreground mb-1">Session Code:</p>
							<code className="text-lg font-mono font-semibold text-foreground">
								{error.sessionCode}
							</code>
						</div>
					)}

					{/* Actions */}
					<div className="space-y-3">
						<Button asChild className="w-full">
							<Link to="/planning-poker">
								🏠 Back to Planning Poker
							</Link>
						</Button>
						
						<div className="flex gap-2">
							<Button variant="outline" size="sm" className="flex-1" asChild>
								<Link to="/planning-poker/create">
									✨ Create New Session
								</Link>
							</Button>
							
							<Button variant="outline" size="sm" className="flex-1" asChild>
								<Link to="/planning-poker/join">
									🚪 Join Session
								</Link>
							</Button>
						</div>
					</div>
				</div>

				{/* Help Text */}
				<div className="mt-6 text-center">
					<p className="text-sm text-muted-foreground">
						Need help? Make sure your session code is correct and the session hasn't expired.
					</p>
				</div>
			</div>
		</div>
	)
}

// Helper function to detect error type from message
export function parseSessionError(statusText: string, sessionCode?: string): SessionErrorBoundaryProps['error'] {
	const message = statusText.toLowerCase()
	
	if (message.includes('expired')) {
		return {
			type: 'expired',
			sessionCode,
			message: statusText
		}
	}
	
	if (message.includes('not found')) {
		return {
			type: 'not_found',
			sessionCode,
			message: statusText
		}
	}
	
	return {
		type: 'generic',
		sessionCode,
		message: statusText
	}
}
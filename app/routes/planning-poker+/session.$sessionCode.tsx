import {
	parseSessionError,
	SessionErrorBoundary,
} from '#app/components/session-error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { useSSE } from '#app/hooks/use-sse.ts'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { useEffect, useState } from 'react'
import {
	data,
	Link,
	useLoaderData,
	useNavigate,
	useParams,
	useRouteError,
	useSearchParams,
} from 'react-router'
import { type Route } from './+types/session.$sessionCode.ts'

export async function loader({ params }: Route.LoaderArgs) {
	const { sessionCode } = params

	if (!sessionCode) {
		throw new Response('Session code is required', { status: 400 })
	}

	const session = PlanningPokerSessionManager.getSession(
		sessionCode.toUpperCase(),
	)

	if (!session) {
		throw new Response(
			'Session expired. Sessions automatically expire after 2 hours of inactivity.',
			{ status: 404 },
		)
	}

	return data({
		session,
	})
}

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Planning Poker Session ${params.sessionCode}` },
]

export function ErrorBoundary() {
	const error = useRouteError()
	const params = useParams()
	const isRouteError = error && typeof error === 'object' && 'status' in error

	if (isRouteError) {
		const routeError = error as {
			status: number
			statusText: string
			data?: any
		}

		// Extract session code from route params
		const sessionCode = params.sessionCode?.toUpperCase()

		if (routeError.status === 404) {
			const errorInfo = parseSessionError(
				routeError.statusText || routeError.data || 'Session not found',
				sessionCode,
			)
			return <SessionErrorBoundary error={errorInfo} />
		}
	}

	// Fallback for other errors
	return (
		<SessionErrorBoundary
			error={{ type: 'generic', message: 'An unexpected error occurred' }}
		/>
	)
}

export default function PlanningPokerSession() {
	const { session } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const participantName = searchParams.get('name')
	const participantId = searchParams.get('participantId')
	const isOwner = searchParams.get('owner') === session.ownerName
	const [selectedVote, setSelectedVote] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [revealedVotes, setRevealedVotes] = useState<Array<{
		participantId: string
		participantName: string
		vote: string
	}> | null>(null)

	const [isLockToggling, setIsLockToggling] = useState(false)
	const [isEndingSession, setIsEndingSession] = useState(false)
	const [isShareCopied, setIsShareCopied] = useState(false)

	// Real-time state management using polling
	const [sessionVotes, setSessionVotes] = useState(session.votes)
	const [sessionVotesRevealed, setSessionVotesRevealed] = useState(
		session.votesRevealed,
	)
	const [sessionParticipants, setSessionParticipants] = useState(
		session.participants,
	)
	const [sessionIsLocked, setSessionIsLocked] = useState(session.isLocked)
	const [voteCount, setVoteCount] = useState(Object.keys(session.votes).length)

	// Calculate voting participants (exclude owner from count)
	const votingParticipants = sessionParticipants.filter(
		(p) => p.name !== session.ownerName,
	)
	const votingParticipantCount = votingParticipants.length
	const [lastUpdate, setLastUpdate] = useState(Date.now())
	const [realtimeStatus, setRealtimeStatus] = useState<string>('Connected')

	// SSE for real-time updates
	const {
		data: sessionData,
		error: sseError,
		isConnected,
	} = useSSE<{
		type?: string
		participants: typeof session.participants
		votes: Record<string, string>
		votesRevealed: boolean
		isLocked?: boolean
		voteCount: number
		timestamp: number
		participantName?: string
		revealedVotes?: Array<{
			participantId: string
			participantName: string
			vote: string
		}>
	}>({
		url: `/planning-poker/sse/${session.sessionCode}`,
		enabled: true,
	})

	// Update state when SSE data changes
	useEffect(() => {
		if (sessionData) {
			const hasChanges =
				JSON.stringify(sessionData.votes) !== JSON.stringify(sessionVotes) ||
				sessionData.votesRevealed !== sessionVotesRevealed ||
				sessionData.participants.length !== sessionParticipants.length ||
				(sessionData.isLocked !== undefined && sessionData.isLocked !== sessionIsLocked)

			if (hasChanges) {
				console.log(
					`🔄 Real-time update received: ${sessionData.type || 'update'}`,
				)
				setSessionVotes(sessionData.votes)
				setSessionVotesRevealed(sessionData.votesRevealed)
				setSessionParticipants(sessionData.participants)
				setVoteCount(sessionData.voteCount)
				setLastUpdate(sessionData.timestamp || Date.now())

				// Update lock status if provided
				if (sessionData.isLocked !== undefined) {
					setSessionIsLocked(sessionData.isLocked)
				}

				// Handle revealed votes data
				if (sessionData.revealedVotes) {
					setRevealedVotes(sessionData.revealedVotes)
				} else if (!sessionData.votesRevealed) {
					setRevealedVotes(null)
				}

				// Clear selected vote when votes are reset
				if (sessionData.type === 'votes_reset') {
					setSelectedVote(null)
				}
			}
		}
	}, [sessionData, sessionVotes, sessionVotesRevealed, sessionParticipants, sessionIsLocked])

	// Update connection status and handle session errors
	useEffect(() => {
		if (sseError) {
			// Check if error indicates session expiration/not found
			if (sseError.includes('not found') || sseError.includes('expired')) {
				// Show a beautiful error message instead of just error text
				setRealtimeStatus('Session expired')
			} else {
				setRealtimeStatus(`Error: ${sseError}`)
			}
		} else if (isConnected) {
			setRealtimeStatus('Connected')
		} else {
			setRealtimeStatus('Connecting...')
		}
	}, [isConnected, sseError])

	// Show error boundary if SSE indicates session expired/not found
	if (
		sseError &&
		(sseError.includes('not found') || sseError.includes('expired'))
	) {
		const errorInfo = parseSessionError(sseError, session.sessionCode)
		return <SessionErrorBoundary error={errorInfo} />
	}

	// Check if current user has voted (owners don't vote)
	const currentUserVote =
		participantId && !isOwner ? sessionVotes[participantId] : null

	// Handle vote submission
	const handleVoteSubmit = async (vote: string) => {
		if (!participantId) {
			alert('Participant ID is missing. Please rejoin the session.')
			return
		}

		if (isOwner) {
			alert('Session owners cannot vote. You can reveal votes when ready.')
			return
		}

		setIsSubmitting(true)
		setSelectedVote(vote)

		try {
			const response = await fetch('/planning-poker/submit-vote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					participantId,
					vote,
				}),
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Failed to submit vote: ${errorText}`)
			}

			console.log(`✅ Vote submitted: ${vote}`)
		} catch (error) {
			console.error('Vote submission error:', error)
			alert('Failed to submit vote. Please try again.')
			setSelectedVote(null)
		} finally {
			setIsSubmitting(false)
		}
	}

	// Handle vote reveal
	const handleRevealVotes = async () => {
		try {
			const response = await fetch('/planning-poker/reveal-votes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to reveal votes')
			}

			console.log('✅ Votes revealed')
		} catch (error) {
			console.error('Reveal votes error:', error)
			alert('Failed to reveal votes. Please try again.')
		}
	}

	// Handle vote reset
	const handleResetVotes = async () => {
		try {
			const response = await fetch('/planning-poker/reset-votes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to reset votes')
			}

			console.log('✅ Votes reset')
			setRevealedVotes(null)
		} catch (error) {
			console.error('Reset votes error:', error)
			alert('Failed to reset votes. Please try again.')
		}
	}

	// Handle session lock toggle
	const handleToggleLock = async () => {
		setIsLockToggling(true)
		try {
			const response = await fetch('/planning-poker/toggle-lock', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to toggle lock')
			}

			const result = await response.json()
			console.log(`✅ Session ${result.isLocked ? 'locked' : 'unlocked'}`)
		} catch (error) {
			console.error('Toggle lock error:', error)
			alert('Failed to toggle session lock. Please try again.')
		} finally {
			setIsLockToggling(false)
		}
	}

	// Handle leave session
	const handleLeaveSession = async () => {
		if (!participantId) {
			alert('Participant ID is missing. Cannot leave session.')
			return
		}

		if (isOwner) {
			alert('Session owners cannot leave. Use "End Session" instead.')
			return
		}

		if (!confirm('Are you sure you want to leave this session?')) {
			return
		}

		try {
			const response = await fetch('/planning-poker/leave-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					participantId,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to leave session')
			}

			console.log('✅ Left session successfully')
			navigate('/planning-poker')
		} catch (error) {
			console.error('Leave session error:', error)
			alert('Failed to leave session. Please try again.')
		}
	}

	// Handle kick participant
	const handleKickParticipant = async (
		targetParticipantId: string,
		targetParticipantName: string,
	) => {
		if (
			!confirm(
				`Are you sure you want to remove ${targetParticipantName} from the session?`,
			)
		) {
			return
		}

		try {
			const response = await fetch('/planning-poker/kick-participant', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
					participantId: targetParticipantId,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to kick participant')
			}

			console.log(`✅ Kicked participant: ${targetParticipantName}`)
		} catch (error) {
			console.error('Kick participant error:', error)
			alert('Failed to kick participant. Please try again.')
		}
	}

	// Handle share session
	const handleShareSession = async () => {
		try {
			const sessionUrl = `${window.location.origin}/planning-poker/join?code=${session.sessionCode}`
			await navigator.clipboard.writeText(sessionUrl)
			setIsShareCopied(true)
			setTimeout(() => setIsShareCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy session URL:', error)
			// Fallback: show the URL in an alert
			const sessionUrl = `${window.location.origin}/planning-poker/join?code=${session.sessionCode}`
			alert(`Share this URL: ${sessionUrl}`)
		}
	}

	// Handle end session
	const handleEndSession = async () => {
		if (
			!confirm(
				'Are you sure you want to end this session? This will save the session data and remove it from active sessions.',
			)
		) {
			return
		}

		setIsEndingSession(true)
		try {
			const response = await fetch('/planning-poker/end-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to end session')
			}

			console.log('✅ Session ended')
			alert('Session has been successfully ended and archived.')
			navigate('/planning-poker')
		} catch (error) {
			console.error('End session error:', error)
			alert('Failed to end session. Please try again.')
		} finally {
			setIsEndingSession(false)
		}
	}

	const voteOptions = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']

	// Calculate vote statistics
	const calculateVoteStatistics = () => {
		if (!sessionVotesRevealed) return null

		// Use revealedVotes if available, otherwise fall back to sessionVotes
		let votes = []
		if (revealedVotes && revealedVotes.length > 0) {
			votes = revealedVotes.map((vote) => vote.vote)
		} else {
			// Fallback to sessionVotes object
			votes = Object.values(sessionVotes).filter(vote => vote !== undefined && vote !== null)
		}

		if (votes.length === 0) return null

		// Count votes by value
		const voteDistribution: Record<string, number> = {}
		votes.forEach(vote => {
			voteDistribution[vote] = (voteDistribution[vote] || 0) + 1
		})

		// Calculate numeric statistics
		const numericVotes = votes
			.filter((vote) => !isNaN(Number(vote)) && vote !== '?' && vote !== '☕')
			.map((vote) => Number(vote))

		let average = null
		let agreement = 0

		if (numericVotes.length > 0) {
			const sum = numericVotes.reduce((acc, vote) => acc + vote, 0)
			average = Math.round((sum / numericVotes.length) * 10) / 10

			// Calculate agreement (percentage of votes that are the same)
			const mostCommonVoteCount = Math.max(...Object.values(voteDistribution))
			agreement = Math.round((mostCommonVoteCount / votes.length) * 100)
		}

		// Find max vote count for scaling bars
		const maxVoteCount = Math.max(...Object.values(voteDistribution))

		return {
			average,
			agreement,
			distribution: voteDistribution,
			maxVoteCount,
			numericCount: numericVotes.length,
			totalCount: votes.length,
		}
	}

	const voteStats = calculateVoteStatistics()

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-4xl">
				{/* Header */}
				<div className="mb-8">
					<div className="mb-4 flex items-center justify-between">
						<Link
							to="/planning-poker"
							className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm"
						>
							← Back to Planning Poker
						</Link>
						<div className="flex items-center gap-2 text-sm">
							<span
								className={`h-2 w-2 rounded-full ${
									isConnected ? 'bg-green-500' : 'bg-red-500'
								}`}
							></span>
							<span className="text-muted-foreground">{realtimeStatus}</span>
						</div>
					</div>

					<h1 className="text-foreground mb-2 text-3xl font-bold">
						{session.name}
					</h1>
					{session.description && (
						<p className="text-muted-foreground mb-4">{session.description}</p>
					)}

					<div className="flex flex-wrap items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="font-medium">Session Code:</span>
							<code className="bg-muted text-foreground rounded px-2 py-1 font-mono">
								{session.sessionCode}
							</code>
							<button
								onClick={handleShareSession}
								className="text-primary hover:text-primary/80 transition-colors"
								title="Share session URL"
							>
								{isShareCopied ? '✅' : '🔗'}
							</button>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">Owner:</span>
							<span>{session.ownerName}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">Participants:</span>
							<span>{sessionParticipants.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">Votes:</span>
							<span>
								{voteCount}/{votingParticipantCount}
							</span>
						</div>
						{sessionIsLocked && (
							<div className="flex items-center gap-2 text-orange-600">
								<span>🔒</span>
								<span className="font-medium">Locked</span>
							</div>
						)}
					</div>
				</div>

				{/* Participants List with Vote Cards */}
				<div className="mb-8">
					<div className="mb-4 flex min-h-[2.5rem] items-center justify-between">
						<h2 className="text-xl font-semibold">Participants</h2>
						{isOwner && (
							<div className="flex h-10 items-center gap-2">
								{!sessionVotesRevealed && voteCount > 0 && (
									<Button onClick={handleRevealVotes}>🎭 Reveal Votes</Button>
								)}
								{sessionVotesRevealed && (
									<Button onClick={handleResetVotes} variant="outline">
										🔄 Reset Votes
									</Button>
								)}
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{sessionParticipants
							.sort((a, b) => {
								// Current user always first
								const aIsCurrentUser = a.id === participantId
								const bIsCurrentUser = b.id === participantId

								if (aIsCurrentUser && !bIsCurrentUser) return -1
								if (!aIsCurrentUser && bIsCurrentUser) return 1

								// Then sort by connection status (active first)
								if (a.isConnected && !b.isConnected) return -1
								if (!a.isConnected && b.isConnected) return 1

								// Finally sort by nameuv tool install claude-monitor
								return a.name.localeCompare(b.name)
							})
							.map((participant) => {
								const hasVoted = sessionVotes[participant.id]
								const isCurrentUser = participant.id === participantId
								const isParticipantOwner =
									participant.name === session.ownerName
								const participantVote =
									revealedVotes?.find((v) => v.participantId === participant.id)
										?.vote ||
									(sessionVotesRevealed ? sessionVotes[participant.id] : null)

								return (
									<div key={participant.id} className="relative">
										{/* Participant Name Tag */}
										<div
											className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 transform rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${
												isCurrentUser
													? 'bg-primary text-primary-foreground border-primary'
													: 'border-gray-300 bg-white'
											} `}
										>
											<div className="flex items-center gap-1">
												<span className="max-w-[80px] truncate">
													{participant.name}
												</span>
												{isParticipantOwner && <span>👑</span>}
												{isCurrentUser && !isOwner && (
													<button
														onClick={handleLeaveSession}
														className="cursor-pointertransition-colors ml-1 hover:text-rose-400"
														title="Leave session"
													>
														✕
													</button>
												)}
												{isCurrentUser && isOwner && (
													<span className="text-muted-foreground ml-1">✕</span>
												)}
												{isOwner && !isParticipantOwner && (
													<button
														onClick={() =>
															handleKickParticipant(
																participant.id,
																participant.name,
															)
														}
														className="ml-1 cursor-pointer transition-colors hover:text-rose-400"
														title={`Remove ${participant.name} from session`}
													>
														✕
													</button>
												)}
											</div>
										</div>

										{/* Vote Card with Flip Animation */}
										<div className="relative aspect-[3/4] [perspective:1000px]">
											<div
												className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] ${
													sessionVotesRevealed && participantVote
														? '[transform:rotateY(180deg)]'
														: ''
												}`}
											>
												{/* Front of card (emoji state) */}
												<div
													className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl border pt-4 pb-2 shadow-sm [backface-visibility:hidden] ${!participant.isConnected ? 'opacity-50' : ''} ${
														hasVoted && !isParticipantOwner
															? 'border-gray-300 bg-gray-200'
															: isParticipantOwner
																? 'border-primary/30 bg-primary/10'
																: 'border-gray-300 bg-gray-100'
													}`}
												>
													<div className="flex flex-1 flex-col items-center justify-center">
														{isParticipantOwner ? (
															/* Owner managing */
															<span className="text-3xl">👑</span>
														) : hasVoted ? (
															/* Has voted - show happy emoji */
															<span className="text-3xl">👍</span>
														) : (
															/* Waiting to vote - show waiting emoji */
															<span className="text-3xl">😐</span>
														)}
													</div>
												</div>

												{/* Back of card (vote revealed state) */}
												<div
													className={`absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center rounded-xl border pt-4 pb-2 shadow-sm [backface-visibility:hidden] ${!participant.isConnected ? 'opacity-50' : ''} ${
														sessionVotesRevealed && participantVote
															? 'border-blue-600 bg-blue-500 text-white'
															: isParticipantOwner
																? 'border-primary/30 bg-primary/10'
																: 'border-gray-300 bg-gray-100'
													}`}
												>
													<div className="flex flex-1 flex-col items-center justify-center">
														{sessionVotesRevealed && participantVote ? (
															/* Show actual vote - large number */
															<span className="text-4xl font-bold">
																{participantVote}
															</span>
														) : isParticipantOwner ? (
															/* Owner managing */
															<span className="text-3xl">👑</span>
														) : (
															/* Fallback */
															<span className="text-3xl">😐</span>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								)
							})}
					</div>

					{/* Vote Results & Statistics */}
					{sessionVotesRevealed && voteStats && (
						<div className="mt-8">
							<div className="bg-muted/30 rounded-lg border p-6">
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
									{/* Vote Distribution - Left side (2/3) */}
									<div className="lg:col-span-2">
										<h3 className="mb-4 text-lg font-semibold">Vote Distribution</h3>
										<div className="flex items-end justify-start gap-2 sm:gap-3">
											{(() => {
												const votedOptions = voteOptions
													.filter(option => voteStats.distribution[option] > 0)
													.sort((a, b) => (voteStats.distribution[b] || 0) - (voteStats.distribution[a] || 0))
												
												const top5Options = votedOptions.slice(0, 5)
												const remainingOptions = votedOptions.slice(5)
												
												// Calculate Others count
												const othersCount = remainingOptions.reduce((sum, option) => 
													sum + (voteStats.distribution[option] || 0), 0
												)
												
												// Create display options array
												const displayOptions = [...top5Options]
												if (othersCount > 0) {
													displayOptions.push('Others')
												}
												
												// Check if there's a clear winner (not all votes are equal)
												const hasUniqueWinner = votedOptions.length > 1 && 
													(voteStats.distribution[votedOptions[0]] || 0) > (voteStats.distribution[votedOptions[1]] || 0)
												
												// Color scheme for bars (blue for most voted only if there's a clear winner)
												const getBarColor = (index: number, isOthers: boolean) => {
													if (index === 0 && !isOthers && hasUniqueWinner) {
														return 'bg-blue-500' // Most voted - blue (only if clear winner)
													}
													return 'bg-gray-400' // All others - gray
												}
												
												const getCardStyle = (index: number, isOthers: boolean) => {
													if (index === 0 && !isOthers && hasUniqueWinner) {
														return 'border-blue-600 bg-blue-500 text-white' // Most voted - blue (only if clear winner)
													}
													return 'border-gray-300 bg-gray-100' // All others - gray
												}
												
												return displayOptions.map((option, index) => {
													const count = option === 'Others' ? othersCount : (voteStats.distribution[option] || 0)
													const percentage = voteStats.maxVoteCount > 0 
														? (count / voteStats.maxVoteCount) * 100 
														: 0
													const isOthers = option === 'Others'
													
													return (
														<div key={option} className="flex flex-col items-center">
															{/* Bar visualization */}
															<div className="mb-2 flex h-32 items-end">
																{/* Bar background container */}
																<div className="bg-muted relative w-10 h-full rounded overflow-hidden sm:w-12 md:w-14">
																	{/* Actual bar */}
																	<div 
																		className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${getBarColor(index, isOthers)}`}
																		style={{ height: `${percentage}%` }}
																	/>
																</div>
															</div>
															
															{/* Vote value */}
															<div className={`border-2 mb-1 flex h-10 w-10 items-center justify-center rounded sm:h-12 sm:w-12 md:h-14 md:w-14 ${getCardStyle(index, isOthers)}`}>
																<span className="text-base font-semibold sm:text-lg">
																	{option === 'Others' ? '...' : option}
																</span>
															</div>
															
															{/* Vote count */}
															<div className="text-muted-foreground mt-1 text-xs">
																{count} {count === 1 ? 'Vote' : 'Votes'}
															</div>
														</div>
													)
												})
											})()}
										</div>
									</div>
									
									{/* Statistics - Right side (1/3) */}
									<div className="flex flex-col items-center justify-center border-t pt-6 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6">
										{voteStats.average !== null && (
											<div className="mb-6 text-center">
												<div className="text-muted-foreground text-sm">Average:</div>
												<div className="text-4xl font-bold">{voteStats.average}</div>
											</div>
										)}
										
										<div className="text-center">
											<div className="text-muted-foreground mb-2 text-sm">Agreement:</div>
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-16 w-16">
													<svg className="h-16 w-16 -rotate-90">
														<circle
															cx="32"
															cy="32"
															r="28"
															stroke="currentColor"
															strokeWidth="8"
															fill="none"
															className="text-muted"
														/>
														<circle
															cx="32"
															cy="32"
															r="28"
															stroke="currentColor"
															strokeWidth="8"
															fill="none"
															strokeDasharray={`${(voteStats.agreement / 100) * 176} 176`}
															className="text-green-500 transition-all duration-700"
														/>
													</svg>
													<div className="absolute inset-0 flex items-center justify-center">
														<span className="text-lg">🤝</span>
													</div>
												</div>
												<span className="text-2xl font-semibold">{voteStats.agreement}%</span>
											</div>
										</div>
										
										{voteStats.numericCount < voteStats.totalCount && (
											<div className="text-muted-foreground mt-4 text-xs">
												{voteStats.numericCount}/{voteStats.totalCount} numeric votes
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Session Owner - Unified Controls */}
				{isOwner && (
					<div className="mb-8">
						<div className="bg-muted/50 border-border rounded-lg border p-6 text-center">
							<div className="mb-3 flex justify-center">
								<div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
									<span className="text-xl">👑</span>
								</div>
							</div>
							<h2 className="mb-2 text-xl font-semibold">Session Owner</h2>
							<p className="text-muted-foreground mb-6">
								As the session owner, you manage the voting process but don't
								vote yourself. Use the controls below to manage your session.
							</p>

							{/* Owner Action Buttons */}
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Button
									onClick={handleToggleLock}
									variant="outline"
									disabled={isLockToggling}
									className="w-full"
								>
									{isLockToggling
										? '⏳ Processing...'
										: sessionIsLocked
											? '🔓 Unlock Session'
											: '🔒 Lock Session'}
								</Button>
								<Button
									onClick={handleEndSession}
									variant="destructive"
									disabled={isEndingSession}
									className="w-full"
								>
									{isEndingSession ? '⏳ Ending...' : '🏁 End Session'}
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Voting Cards */}
				{!sessionVotesRevealed && !isOwner && participantId && (
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">Cast Your Vote</h2>
						<div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
							{voteOptions.map((option) => {
								const isSelected =
									currentUserVote === option || selectedVote === option
								const isCurrentUserCard = currentUserVote === option
								return (
									<button
										key={option}
										onClick={() => handleVoteSubmit(option)}
										disabled={isSubmitting}
										className={`flex aspect-[3/4] cursor-pointer items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-200 ${
											isSelected
												? isCurrentUserCard
													? '-translate-y-4 scale-102 border-blue-600 bg-blue-500 text-white'
													: 'border-primary bg-primary/20 text-primary scale-105 shadow-lg'
												: 'border-border bg-card hover:border-primary/50 hover:bg-muted'
										} hover:scale-102 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50`}
									>
										{option}
									</button>
								)
							})}
						</div>
						{currentUserVote && (
							<p className="text-muted-foreground mt-4 text-center text-sm">
								Your vote: <strong>{currentUserVote}</strong> (you can change it
								anytime)
							</p>
						)}
					</div>
				)}

				{/* Real-time Status */}
				<div className="text-muted-foreground text-center text-xs">
					Last updated: {new Date(lastUpdate).toLocaleTimeString()} •{' '}
					{realtimeStatus}
				</div>
			</div>
		</div>
	)
}

import {
	parseSessionError,
	SessionErrorBoundary,
} from '#app/components/session-error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { useSSE } from '#app/hooks/use-sse.ts'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import {
	getVoteValueBarColor,
	getVoteValueColor,
} from '#app/utils/vote-value-colors.ts'
import { useCallback, useEffect, useRef, useState } from 'react'
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

	// Random participant picker state
	const [randomPickedParticipant, setRandomPickedParticipant] = useState<{
		id: string
		name: string
		vote: string
	} | null>(null)
	const [isRandomPicking, setIsRandomPicking] = useState(false)
	const [randomPickDisplay, setRandomPickDisplay] = useState<string | null>(
		null,
	)
	const randomPickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	)
	const [showPickOverlay, setShowPickOverlay] = useState(false)
	const cleanupRef = useRef<(() => void) | null>(null)

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
	const [sessionCustomOptions, setSessionCustomOptions] = useState(
		session.customVoteOptions,
	)

	// Calculate voting participants (exclude owner from count)
	const votingParticipants = sessionParticipants.filter(
		(p) => p.name !== session.ownerName,
	)
	const votingParticipantCount = votingParticipants.length
	const [lastUpdate, setLastUpdate] = useState(Date.now())
	const [realtimeStatus, setRealtimeStatus] = useState<string>('Connected')

	// Timer state
	const [roundStartedAt, setRoundStartedAt] = useState<number>(
		session.roundStartedAt,
	)
	const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)

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
		customVoteOptions?: string[]
		revealedVotes?: Array<{
			participantId: string
			participantName: string
			vote: string
		}>
		randomPick?: {
			participantId: string
			participantName: string
			vote: string
		}
		roundStartedAt?: number
	}>({
		url: `/planning-poker/sse/${session.sessionCode}`,
		enabled: true,
	})

	// Run random pick animation (triggered by SSE for all clients)
	const runRandomPickAnimation = useCallback(
		(picked: {
			participantId: string
			participantName: string
			vote: string
		}) => {
			// Get all non-owner participant names for the cycling animation
			const participantNames = sessionParticipants
				.filter((p) => p.name !== session.ownerName)
				.map((p) => p.name)

			if (participantNames.length === 0) {
				// No names to cycle through, just show the result directly
				setRandomPickedParticipant({
					id: picked.participantId,
					name: picked.participantName,
					vote: picked.vote,
				})
				setRandomPickDisplay(picked.participantName)
				return
			}

			setIsRandomPicking(true)
			setRandomPickedParticipant(null)
			setShowPickOverlay(false)

			// Clear any existing timeout
			if (randomPickIntervalRef.current) {
				clearTimeout(randomPickIntervalRef.current)
			}

			const totalCycles = 20
			let cycleCount = 0

			const runCycle = () => {
				let displayName: string
				if (cycleCount < totalCycles - 1) {
					displayName =
						participantNames[
							Math.floor(Math.random() * participantNames.length)
						]!
				} else {
					// Last cycle — land on the final pick
					displayName = picked.participantName
				}
				setRandomPickDisplay(displayName)
				cycleCount++

				if (cycleCount >= totalCycles) {
					randomPickIntervalRef.current = null
					setRandomPickedParticipant({
						id: picked.participantId,
						name: picked.participantName,
						vote: picked.vote,
					})
					setRandomPickDisplay(picked.participantName)
					setIsRandomPicking(false)

					// Show zoom overlay (confetti handled by useEffect)
					setTimeout(() => {
						setShowPickOverlay(true)
					}, 200)

					return
				}

				// Ease-out: starts fast (50ms), slows dramatically to ~800ms at the end
				const progress = cycleCount / totalCycles
				const delay = 50 + 750 * (progress * progress * progress)
				randomPickIntervalRef.current = setTimeout(runCycle, delay)
			}

			runCycle()
		},
		[session.ownerName, sessionParticipants],
	)

	// Update state when SSE data changes
	useEffect(() => {
		if (sessionData) {
			const hasChanges =
				JSON.stringify(sessionData.votes) !== JSON.stringify(sessionVotes) ||
				sessionData.votesRevealed !== sessionVotesRevealed ||
				sessionData.participants.length !== sessionParticipants.length ||
				(sessionData.isLocked !== undefined &&
					sessionData.isLocked !== sessionIsLocked) ||
				sessionData.type === 'random_pick'

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

				// Update custom vote options if provided
				if (sessionData.customVoteOptions !== undefined) {
					setSessionCustomOptions(sessionData.customVoteOptions)
				}

				// Update round timer
				if (sessionData.roundStartedAt !== undefined) {
					setRoundStartedAt(sessionData.roundStartedAt)
				}

				// Handle revealed votes data
				if (sessionData.revealedVotes) {
					setRevealedVotes(sessionData.revealedVotes)
				} else if (!sessionData.votesRevealed) {
					setRevealedVotes(null)
					setRandomPickedParticipant(null)
					setRandomPickDisplay(null)
					setShowPickOverlay(false)
				}

				// Clear selected vote when votes are reset
				if (sessionData.type === 'votes_reset') {
					setSelectedVote(null)
					setRandomPickedParticipant(null)
					setRandomPickDisplay(null)
					setShowPickOverlay(false)
				}

				// Handle random pick event from server
				if (sessionData.type === 'random_pick' && sessionData.randomPick) {
					runRandomPickAnimation(sessionData.randomPick)
				}
			}
		}
	}, [
		sessionData,
		sessionVotes,
		sessionVotesRevealed,
		sessionParticipants,
		sessionIsLocked,
		runRandomPickAnimation,
	])

	// Continuous confetti while overlay is open
	useEffect(() => {
		if (!showPickOverlay) return

		let cancelled = false

		import('canvas-confetti').then((confettiModule) => {
			if (cancelled) return
			const confetti = confettiModule.default
			const colors = ['#a855f7', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6']

			// Initial burst
			confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors })

			// Repeating confetti
			const interval = setInterval(() => {
				if (cancelled) return
				confetti({
					particleCount: 40,
					spread: 80,
					origin: { x: Math.random(), y: Math.random() * 0.4 },
					colors,
				})
			}, 600)

			// Store cleanup ref
			const cleanup = () => {
				cancelled = true
				clearInterval(interval)
			}
			cleanupRef.current = cleanup
		})

		return () => {
			cancelled = true
			cleanupRef.current?.()
		}
	}, [showPickOverlay])

	// Timer tick effect
	useEffect(() => {
		// If votes are revealed, freeze the timer
		if (sessionVotesRevealed) {
			return
		}

		const tick = () => {
			const elapsed = Math.floor((Date.now() - roundStartedAt) / 1000)
			setElapsedSeconds(Math.max(0, elapsed))
		}

		tick()
		const intervalId = setInterval(tick, 1000)

		return () => clearInterval(intervalId)
	}, [roundStartedAt, sessionVotesRevealed])

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

	// Owner triggers random pick via API (broadcasts to all clients via SSE)
	const handleRandomPick = useCallback(async () => {
		try {
			const response = await fetch('/planning-poker/random-pick', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionCode: session.sessionCode,
					ownerName: session.ownerName,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to random pick')
			}
		} catch (error) {
			console.error('Random pick error:', error)
			alert('Failed to random pick. Please try again.')
		}
	}, [session.sessionCode, session.ownerName])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (randomPickIntervalRef.current) {
				clearTimeout(randomPickIntervalRef.current)
			}
		}
	}, [])

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
			setRandomPickedParticipant(null)
			setRandomPickDisplay(null)
			setShowPickOverlay(false)
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

			const result = (await response.json()) as { isLocked: boolean }
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
				const errorData = (await response.json()) as { error?: string }
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
				const errorData = (await response.json()) as { error?: string }
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

	const formatElapsedTime = (totalSeconds: number): string => {
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
	}

	const defaultVoteOptions = ['0.5', '1', '2', '3', '5', '8']
	const voteOptions = sessionCustomOptions || defaultVoteOptions

	// Calculate vote statistics
	const calculateVoteStatistics = () => {
		if (!sessionVotesRevealed) return null

		// Use revealedVotes if available, otherwise fall back to sessionVotes
		let votes = []
		if (revealedVotes && revealedVotes.length > 0) {
			votes = revealedVotes.map((vote) => vote.vote)
		} else {
			// Fallback to sessionVotes object
			votes = Object.values(sessionVotes).filter(
				(vote) => vote !== undefined && vote !== null,
			)
		}

		if (votes.length === 0) return null

		// Count votes by value
		const voteDistribution: Record<string, number> = {}
		votes.forEach((vote) => {
			voteDistribution[vote] = (voteDistribution[vote] || 0) + 1
		})

		// Calculate numeric statistics for average (only numeric votes)
		const numericVotes = votes
			.filter((vote) => !isNaN(Number(vote)) && vote !== '?' && vote !== '☕')
			.map((vote) => Number(vote))

		let average = null
		let agreement = 0

		// Calculate average only from numeric votes
		if (numericVotes.length > 0) {
			const sum = numericVotes.reduce((acc, vote) => acc + vote, 0)
			average = Math.round((sum / numericVotes.length) * 10) / 10
		}

		// Calculate agreement from all votes except uncertainty markers (?, ☕)
		const agreementVotes = votes.filter((vote) => vote !== '?' && vote !== '☕')
		if (agreementVotes.length > 0) {
			const agreementDistribution: Record<string, number> = {}
			agreementVotes.forEach((vote) => {
				agreementDistribution[vote] = (agreementDistribution[vote] || 0) + 1
			})
			const mostCommonVoteCount = Math.max(
				...Object.values(agreementDistribution),
			)
			agreement = Math.round(
				(mostCommonVoteCount / agreementVotes.length) * 100,
			)
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
						<div className="flex items-center gap-2">
							<span className="font-medium">Time:</span>
							<span className="font-mono text-sm">
								{formatElapsedTime(elapsedSeconds)}
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
					<div className="mb-6 flex min-h-[2.5rem] items-center justify-between">
						<div className="flex items-center gap-3">
							<h2 className="text-xl font-semibold">Participants</h2>
							{(randomPickedParticipant || isRandomPicking) && (
									<div className="flex items-center gap-2">
										(
										{isRandomPicking ? (
											<>
												<span className="animate-bounce text-xl">🎲</span>
												<span className="text-foreground animate-pulse text-lg font-bold">
													{randomPickDisplay || 'Picking...'}
												</span>
											</>
										) : randomPickedParticipant ? (
											<>
												<span className="text-muted-foreground text-sm">
													Picked:
												</span>
												<span className="text-xl">🎉</span>
												<span className="text-lg font-bold">
													{randomPickedParticipant.name}
												</span>
											</>
										) : null}
										)
									</div>
								)}
						</div>
						<div className="flex h-10 items-center gap-2">
							{isOwner && votingParticipantCount > 0 && (
								<Button
									onClick={handleRandomPick}
									variant="outline"
									disabled={isRandomPicking}
								>
									{isRandomPicking ? '🎰 Picking...' : '🎲 Random Pick'}
								</Button>
							)}
							{isOwner && !sessionVotesRevealed && voteCount > 0 && (
								<Button onClick={handleRevealVotes}>🎭 Reveal Votes</Button>
							)}
							{isOwner && sessionVotesRevealed && (
								<Button onClick={handleResetVotes} variant="outline">
									🔄 Reset Votes
								</Button>
							)}
						</div>
					</div>

					<div className="grid grid-cols-4 gap-4 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
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
							.map((participant, index) => {
								const hasVoted = sessionVotes[participant.id]
								const isCurrentUser = participant.id === participantId
								const isParticipantOwner =
									participant.name === session.ownerName
								const participantVote =
									revealedVotes?.find((v) => v.participantId === participant.id)
										?.vote ||
									(sessionVotesRevealed ? sessionVotes[participant.id] : null)
								const participantColor = participantVote
									? getVoteValueColor(participantVote)
									: null
								const isRandomPicked =
									randomPickedParticipant?.id === participant.id ||
									(isRandomPicking && randomPickDisplay === participant.name)

								return (
									<div key={participant.id} className="relative">
										{/* Participant Name Tag */}
										<div
											className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 transform rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${
												isCurrentUser
													? 'bg-primary text-primary-foreground border-primary'
													: 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
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
										<div
											className={`relative aspect-[3/4] rounded-xl [perspective:1000px] ${isRandomPicked ? 'animate-border-spin' : ''}`}
										>
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
														sessionVotesRevealed &&
														participantVote &&
														participantColor
															? `${participantColor.border} ${participantColor.bg} ${participantColor.text}`
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
							<div className="bg-muted/50 border-border rounded-lg border p-6 text-center">
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
									{/* Vote Distribution - Left side (2/3) */}
									<div className="lg:col-span-2">
										<h3 className="mb-4 text-lg font-semibold">
											Vote Distribution
										</h3>
										<div className="flex items-end justify-start gap-2 sm:gap-3">
											{(() => {
												const votedOptions = voteOptions
													.filter(
														(option) => voteStats.distribution[option] > 0,
													)
													.sort(
														(a, b) =>
															(voteStats.distribution[b] || 0) -
															(voteStats.distribution[a] || 0),
													)

												const top5Options = votedOptions.slice(0, 5)
												const remainingOptions = votedOptions.slice(5)

												// Calculate Others count
												const othersCount = remainingOptions.reduce(
													(sum, option) =>
														sum + (voteStats.distribution[option] || 0),
													0,
												)

												// Create display options array
												const displayOptions = [...top5Options]
												if (othersCount > 0) {
													displayOptions.push('Others')
												}

												// Check if there's a clear winner or only one option voted
												const hasUniqueWinner =
													votedOptions.length === 1 ||
													(votedOptions.length > 1 &&
														votedOptions[0] !== undefined &&
														votedOptions[1] !== undefined &&
														(voteStats.distribution[votedOptions[0]] || 0) >
															(voteStats.distribution[votedOptions[1]] || 0))

												// Use unified color scheme for bars
												const getBarColor = (
													index: number,
													isOthers: boolean,
													option: string,
												) => {
													if (isOthers) {
														return 'bg-gray-400'
													}
													return getVoteValueBarColor(option)
												}

												const getCardStyle = (
													index: number,
													isOthers: boolean,
													option: string,
												) => {
													if (isOthers) {
														return 'border-gray-300 bg-gray-100'
													}
													const color = getVoteValueColor(option)
													return `${color.border} ${color.bg} ${color.text}`
												}

												return displayOptions.map((option, index) => {
													const count =
														option === 'Others'
															? othersCount
															: voteStats.distribution[option] || 0
													const percentage =
														voteStats.maxVoteCount > 0
															? (count / voteStats.maxVoteCount) * 100
															: 0
													const isOthers = option === 'Others'

													return (
														<div
															key={option}
															className="flex flex-col items-center"
														>
															{/* Bar visualization */}
															<div className="mb-2 flex h-32 items-end">
																{/* Bar background container */}
																<div className="bg-muted relative h-full w-10 overflow-hidden rounded sm:w-12 md:w-14">
																	{/* Actual bar */}
																	<div
																		className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${getBarColor(index, isOthers, option)}`}
																		style={{ height: `${percentage}%` }}
																	/>
																</div>
															</div>

															{/* Vote value */}
															<div
																className={`mb-1 flex h-10 w-10 items-center justify-center rounded border-2 sm:h-12 sm:w-12 md:h-14 md:w-14 ${getCardStyle(index, isOthers, option)}`}
															>
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
									<div className="border-border flex flex-col items-center justify-center border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
										{voteStats.average !== null && (
											<div className="mb-6 text-center">
												<div className="text-muted-foreground text-sm">
													Average:
												</div>
												<div className="text-4xl font-bold">
													{voteStats.average}
												</div>
											</div>
										)}

										<div className="text-center">
											<div className="text-muted-foreground mb-2 text-sm">
												Agreement:
											</div>
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
												<span className="text-2xl font-semibold">
													{voteStats.agreement}%
												</span>
											</div>
										</div>

										{voteStats.numericCount < voteStats.totalCount && (
											<div className="text-muted-foreground mt-4 text-xs">
												{voteStats.numericCount}/{voteStats.totalCount} numeric
												votes
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

							{/* Current Vote Options Display */}
							{sessionCustomOptions && (
								<div className="mb-6">
									<h3 className="mb-2 text-sm font-medium">
										Vote Options for this Session:
									</h3>
									<div className="flex flex-wrap justify-center gap-1">
										{sessionCustomOptions.map((option, index) => (
											<span
												key={index}
												className="bg-primary/10 text-primary rounded px-2 py-1 text-xs"
											>
												{option}
											</span>
										))}
									</div>
									<p className="text-muted-foreground mt-2 text-xs">
										Custom vote options were set when this session was created.
									</p>
								</div>
							)}

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

			{/* Random Pick Zoom Overlay */}
			{showPickOverlay && randomPickedParticipant && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
					onClick={() => setShowPickOverlay(false)}
				>
					<div
						className="animate-zoom-to-center animate-border-spin flex aspect-[3/4] w-52 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-white/95 to-gray-100/95 shadow-2xl dark:from-gray-800/95 dark:to-gray-900/95 sm:w-60 md:w-72"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex flex-1 flex-col items-center justify-center gap-4">
							<span className="text-6xl drop-shadow-sm">🎉</span>
							<div className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
								{randomPickedParticipant.name}
							</div>
							<div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-1.5 text-sm font-semibold text-white shadow-md">
								Picked!
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

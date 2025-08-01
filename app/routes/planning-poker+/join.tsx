import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	data,
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
	type ActionFunctionArgs,
} from 'react-router'
import { z } from 'zod'
import { type Route } from './+types/join.ts'

const JoinSessionSchema = z.object({
	participantName: z.string().min(1, 'Your name is required').max(50),
	sessionCode: z
		.string()
		.min(6, 'Session code must be 6 characters')
		.max(6)
		.regex(/^[A-Z0-9]+$/, 'Invalid session code format'),
})

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const codeFromQuery = url.searchParams.get('code')

	return data({
		sessionCode: codeFromQuery?.toUpperCase() || '',
	})
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: JoinSessionSchema,
	})

	if (submission.status !== 'success') {
		return submission.reply()
	}

	const { participantName, sessionCode } = submission.value

	try {
		// Join the session and broadcast SSE updates for real-time UI updates
		const result = PlanningPokerSessionManager.joinSession(
			sessionCode.toUpperCase(),
			participantName,
		)

		if (!result.success) {
			// Provide more specific error messages based on the error type
			let errorMessage = result.error || 'Failed to join session'

			if (result.error === 'Session not found') {
				errorMessage = `Session ${sessionCode.toUpperCase()} was not found. The session may have expired (sessions expire after 2 hours of inactivity), ended, or the code may be incorrect.`
			} else if (result.error === 'Session is locked') {
				errorMessage = `Session ${sessionCode.toUpperCase()} is currently locked and not accepting new participants.`
			}

			return submission.reply({
				formErrors: [errorMessage],
			})
		}

		console.log('Participant joined session:', sessionCode, participantName)
		return redirect(
			`/planning-poker/session/${sessionCode.toUpperCase()}?name=${encodeURIComponent(participantName)}&participantId=${result.participant?.id}`,
		)
	} catch (error) {
		console.error('Error joining session:', error)
		return submission.reply({
			formErrors: ['Failed to join session. Please try again.'],
		})
	}
}

export const meta: Route.MetaFunction = () => [
	{
		title:
			'Join Planning Poker Game - Enter Agile Estimation Session | Scrum Poker',
	},
	{
		name: 'description',
		content:
			'Join a planning poker game session with your agile team. Enter your session code to start estimating story points and participate in sprint planning with scrum poker cards.',
	},
	{
		name: 'keywords',
		content:
			'join planning poker, planning poker game, scrum poker session, agile estimation, story points, sprint planning, team estimation',
	},
]

export default function JoinSession() {
	const lastResult = useActionData<typeof action>()
	const { sessionCode: defaultSessionCode } = useLoaderData<typeof loader>()
	const [form, fields] = useForm({
		id: 'join-session',
		constraint: getZodConstraint(JoinSessionSchema),
		lastResult,
		defaultValue: {
			sessionCode: defaultSessionCode,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: JoinSessionSchema })
		},
	})

	return (
		<div className="from-background via-primary/5 to-secondary/10 min-h-screen bg-gradient-to-br">
			<div className="container mx-auto px-4 py-12">
				<div className="mx-auto max-w-6xl">
					{/* Back Link */}
					<div className="mb-8">
						<Link
							to="/planning-poker"
							className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm transition-colors"
						>
							← Back to Planning Poker
						</Link>
					</div>

					{/* Two Column Layout */}
					<div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
						{/* Left Column - Title & What Happens Next */}
						<div className="space-y-8">
							{/* Title Section */}
							<div>
								<div className="from-secondary/20 to-primary/20 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
									<span className="text-3xl">🎯</span>
								</div>
								<h1 className="text-foreground from-secondary to-primary mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent">
									Join Planning Poker Game
								</h1>
								{defaultSessionCode ? (
									<div className="mb-4">
										<p className="text-muted-foreground mb-3 text-lg leading-relaxed">
											You've been invited to join this planning poker game
											session
										</p>
									</div>
								) : (
									<p className="text-muted-foreground text-lg leading-relaxed">
										Enter your details to join the agile estimation session and
										start collaborating with your scrum team for story point
										estimation
									</p>
								)}
							</div>

							{/* What Happens Next Section */}
							<div className="bg-muted/50 border-border rounded-lg border p-6">
								<div className="mb-4 flex items-center gap-3">
									<div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
										<span className="text-xl">✨</span>
									</div>
									<h3 className="text-xl font-semibold">What happens next?</h3>
								</div>
								<p className="text-muted-foreground mb-6">
									After joining, you'll become an active participant in the
									planning poker session with full voting capabilities.
								</p>

								{/* Benefits List */}
								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
											<span className="text-sm">🚀</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Instant session access
											</p>
											<p className="text-muted-foreground text-xs">
												Join active planning poker immediately
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
											<span className="text-sm">🃏</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Vote with Fibonacci cards
											</p>
											<p className="text-muted-foreground text-xs">
												Use standard story point values
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
											<span className="text-sm">🎭</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Beautiful reveal animations
											</p>
											<p className="text-muted-foreground text-xs">
												Flip card animations for results
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
											<span className="text-sm">👥</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Real-time team collaboration
											</p>
											<p className="text-muted-foreground text-xs">
												See votes and progress instantly
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Right Column - Beautiful Form */}
						<div className="from-card via-card to-muted/10 border-primary/10 rounded-3xl border-2 bg-gradient-to-br p-10 shadow-2xl backdrop-blur-sm">
							{/* Form Header */}
							<div className="mb-8 text-center">
								<div className="from-primary/10 to-secondary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
									<span className="text-2xl">🎯</span>
								</div>
								<h2 className="text-foreground mb-2 text-2xl font-bold">
									{defaultSessionCode ? 'Join Session' : 'Session Details'}
								</h2>
								<p className="text-muted-foreground text-sm">
									{defaultSessionCode
										? `Enter your name to join session ${defaultSessionCode}`
										: 'Fill in the details to join the planning poker session'}
								</p>
							</div>

							<Form method="POST" {...getFormProps(form)}>
								<div className="space-y-6">
									{/* Your Name Field */}
									<div className="group">
										<Field
											labelProps={{
												htmlFor: fields.participantName.id,
												children: 'Your Name',
												className:
													'text-foreground mb-3 block text-sm font-semibold flex items-center gap-2',
											}}
											inputProps={{
												...getInputProps(fields.participantName, {
													type: 'text',
												}),
												placeholder: 'Enter your name',
												className:
													'text-lg py-4 px-4 rounded-2xl border-2 border-muted hover:border-primary/50 focus:border-primary transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-lg',
											}}
											errors={fields.participantName.errors}
										/>
									</div>

									{/* Session Code Field */}
									{!defaultSessionCode && (
										<div className="group">
											<Field
												labelProps={{
													htmlFor: fields.sessionCode.id,
													children: 'Session Code',
													className:
														'text-foreground mb-3 block text-sm font-semibold flex items-center gap-2',
												}}
												inputProps={{
													...getInputProps(fields.sessionCode, {
														type: 'text',
													}),
													placeholder: 'ABC123',
													style: { textTransform: 'uppercase' },
													maxLength: 6,
													className:
														'font-mono text-lg py-4 px-4 rounded-2xl border-2 border-muted hover:border-primary/50 focus:border-primary transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-lg',
												}}
												errors={fields.sessionCode.errors}
											/>
										</div>
									)}

									{defaultSessionCode && (
										<input
											type="hidden"
											name="sessionCode"
											value={defaultSessionCode}
										/>
									)}

									{/* Action Buttons */}
									<div className="pt-4">
										<div className="flex gap-4">
											<Button
												type="submit"
												size="lg"
												className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 font-medium"
											>
												Join Session
											</Button>
											<Button
												asChild
												variant="outline"
												size="lg"
												className="hover:bg-muted/50 border px-8 font-medium"
											>
												<Link to="/planning-poker">Cancel</Link>
											</Button>
										</div>
										{/* Success Hint */}
										<div className="mt-4 text-center">
											<p className="text-muted-foreground text-xs">
												✨ You'll join the session instantly and can start
												voting
											</p>
										</div>
									</div>

									<ErrorList id={form.errorId} errors={form.errors} />
								</div>
							</Form>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

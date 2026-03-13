import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { PlanningPokerSessionManager } from '#app/utils/planning-poker.server.ts'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	Form,
	Link,
	redirect,
	useActionData,
	type ActionFunctionArgs,
} from 'react-router'
import { useState } from 'react'
import { z } from 'zod'
import { type Route } from './+types/create.ts'

const CreateSessionSchema = z.object({
	sessionName: z.string().min(1, 'Session name is required').max(100),
	ownerName: z.string().max(50).optional(),
	description: z.string().max(500).optional(),
	customVoteOptions: z.string().max(200).optional(),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: CreateSessionSchema,
	})

	if (submission.status !== 'success') {
		return submission.reply()
	}

	const { ownerName, sessionName, description, customVoteOptions } = submission.value

	// Use "Host" as default if ownerName is empty
	const finalOwnerName = ownerName?.trim() || 'Host'

	try {
		// Parse custom vote options if provided
		let parsedCustomOptions: string[] | undefined = undefined
		if (customVoteOptions?.trim()) {
			parsedCustomOptions = customVoteOptions
				.split(',')
				.map(option => option.trim())
				.filter(option => option.length > 0)

			// Validate custom options
			if (parsedCustomOptions.length === 0) {
				return submission.reply({
					fieldErrors: {
						customVoteOptions: ['Please provide at least one vote option'],
					},
				})
			}

			if (parsedCustomOptions.length > 10) {
				return submission.reply({
					fieldErrors: {
						customVoteOptions: ['Maximum 10 vote options allowed'],
					},
				})
			}

			// Check for duplicates
			const uniqueOptions = new Set(parsedCustomOptions)
			if (uniqueOptions.size !== parsedCustomOptions.length) {
				return submission.reply({
					fieldErrors: {
						customVoteOptions: ['Duplicate vote options are not allowed'],
					},
				})
			}

			// Validate each option length
			for (const option of parsedCustomOptions) {
				if (option.length > 5) {
					return submission.reply({
						fieldErrors: {
							customVoteOptions: ['Each vote option must be 5 characters or less'],
						},
					})
				}
			}
		}

		// Create session in memory storage
		const session = PlanningPokerSessionManager.createSession({
			name: sessionName,
			description: description || undefined,
			ownerName: finalOwnerName,
			customVoteOptions: parsedCustomOptions,
		})

		console.log('Created session:', session.sessionCode)
		return redirect(
			`/planning-poker/session/${session.sessionCode}?owner=${encodeURIComponent(finalOwnerName)}`,
		)
	} catch (error) {
		console.error('Error creating session:', error)
		return submission.reply({
			formErrors: ['Failed to create session. Please try again.'],
		})
	}
}

export const meta: Route.MetaFunction = () => [
	{
		title:
			'Create Planning Poker Game Session - Start Agile Estimation | Scrum Poker',
	},
	{
		name: 'description',
		content:
			'Create a new planning poker game session for your agile team. Set up scrum poker cards for story point estimation, sprint planning, and collaborative agile development.',
	},
	{
		name: 'keywords',
		content:
			'create planning poker, planning poker game, new scrum poker session, agile estimation setup, story points, sprint planning session',
	},
]

export default function CreateSession() {
	const lastResult = useActionData<typeof action>()
	const [showCustomOptions, setShowCustomOptions] = useState(false)
	const [form, fields] = useForm({
		id: 'create-session',
		constraint: getZodConstraint(CreateSessionSchema),
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateSessionSchema })
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
								<div className="from-primary/20 to-secondary/20 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
									<span className="text-3xl">🚀</span>
								</div>
								<h1 className="text-foreground from-primary to-secondary mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent">
									Create Planning Poker Game
								</h1>
								<p className="text-muted-foreground text-lg leading-relaxed">
									Set up a new agile estimation session and invite your scrum
									team to start playing planning poker together for story point
									estimation
								</p>
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
									After creating your session, you'll become the session owner
									with full control over the planning poker game.
								</p>

								{/* Benefits List */}
								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
											<span className="text-sm">🔗</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Get unique session code & link
											</p>
											<p className="text-muted-foreground text-xs">
												Share with your team instantly
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
											<span className="text-sm">👥</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Team joins instantly with name
											</p>
											<p className="text-muted-foreground text-xs">
												No complex setup required
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
											<span className="text-sm">🎯</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Manage voting with animations
											</p>
											<p className="text-muted-foreground text-xs">
												Beautiful card flip animations
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
											<span className="text-sm">🔒</span>
										</div>
										<div>
											<p className="text-sm font-medium">
												Control access & participants
											</p>
											<p className="text-muted-foreground text-xs">
												Lock sessions and manage users
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
											<span className="text-sm">🃏</span>
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium">
												Ready-to-use voting cards
											</p>
											<p className="text-muted-foreground text-xs mb-2">
												Perfect for agile story point estimation
											</p>
											<div className="flex flex-wrap gap-1">
												{['1', '2', '3', '5', '8'].map((option) => (
													<span key={option} className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
														{option}
													</span>
												))}
											</div>
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
									<span className="text-2xl">📝</span>
								</div>
								<h2 className="text-foreground mb-2 text-2xl font-bold">
									Session Details
								</h2>
								<p className="text-muted-foreground text-sm">
									Fill in the details to create your planning poker session
								</p>
							</div>

							<Form method="POST" {...getFormProps(form)}>
								<div className="space-y-6">
									{/* Session Name Field - First */}
									<div className="group">
										<Field
											labelProps={{
												htmlFor: fields.sessionName.id,
												children: 'Session Name',
												className:
													'text-foreground mb-3 block text-sm font-semibold flex items-center gap-2',
											}}
											inputProps={{
												...getInputProps(fields.sessionName, { type: 'text' }),
												placeholder: 'e.g., Sprint 15 Planning',
												className:
													'text-lg py-4 px-4 rounded-2xl border-2 border-muted hover:border-primary/50 focus:border-primary transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-lg',
											}}
											errors={fields.sessionName.errors}
										/>
									</div>

									{/* Your Name Field - Second (Optional) */}
									<div className="group">
										<Field
											labelProps={{
												htmlFor: fields.ownerName.id,
												children: (
													<div className="flex items-center gap-2">
														<span>Your Name</span>
														<span className="text-muted-foreground text-xs">(Optional)</span>
													</div>
												),
												className:
													'text-foreground mb-3 block text-sm font-semibold',
											}}
											inputProps={{
												...getInputProps(fields.ownerName, { type: 'text' }),
												placeholder: 'Defaults to "Host"',
												className:
													'text-lg py-4 px-4 rounded-2xl border-2 border-muted hover:border-primary/50 focus:border-primary transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-lg',
											}}
											errors={fields.ownerName.errors}
										/>
									</div>

									{/* Custom Vote Options Toggle */}
									<div className="group">
										<button
											type="button"
											onClick={() => setShowCustomOptions(!showCustomOptions)}
											className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary"
										>
											<span>Custom Vote Options</span>
											<span className="text-muted-foreground text-xs">(Optional)</span>
											<span className="text-xs ml-auto">
												{showCustomOptions ? '▲' : '▼'}
											</span>
										</button>
									</div>

									{/* Custom Vote Options Field - Collapsible */}
									{showCustomOptions && (
										<div className="group animate-in slide-in-from-top-2 duration-200">
											<Field
												inputProps={{
													...getInputProps(fields.customVoteOptions, { type: 'text' }),
													placeholder: 'e.g., 0.5,1,2,3,5,8 or XS,S,M,L,XL',
													className:
														'text-lg py-4 px-4 rounded-2xl border-2 border-muted hover:border-primary/50 focus:border-primary transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-lg',
												}}
												errors={fields.customVoteOptions.errors}
											/>
											<p className="text-muted-foreground mt-2 text-xs">
												Leave empty for default options (1,2,3,5,8). 
												Enter comma-separated values. Max 10 options, 5 characters each.
											</p>
										</div>
									)}

									{/* Action Buttons */}
									<div className="pt-4">
										<div className="flex gap-4">
											<Button
												type="submit"
												size="lg"
												className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 font-medium"
											>
												Create Session
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
												✨ Your session will be created instantly and ready for
												your team
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

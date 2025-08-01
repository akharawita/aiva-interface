import { Link } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { type Route } from './+types/index.ts'

export const meta: Route.MetaFunction = () => [
	{ title: 'Planning Poker Game - Online Agile Estimation Tool | Scrum Poker Cards' },
	{ name: 'description', content: 'Play planning poker game online with your agile team. Free scrum poker cards for story point estimation, sprint planning, and agile development. Real-time collaborative estimation tool.' },
	{ name: 'keywords', content: 'planning poker, planning poker game, scrum poker, agile estimation, story points, sprint planning, agile poker, estimation game, scrum planning, team estimation' },
]

export default function PlanningPokerIndex() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
			<div className="container mx-auto px-4 py-12">
				<div className="max-w-6xl mx-auto">
					{/* Hero Section */}
					<div className="text-center mb-16">
						<div className="mb-8">
							<div className="bg-gradient-to-br from-primary/20 to-secondary/20 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl shadow-lg">
								<span className="text-4xl">🎯</span>
							</div>
							<h1 className="text-5xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
								Planning Poker Game
							</h1>
							<p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
								Play the ultimate agile estimation game with your scrum team. Use our free online planning poker cards for story point estimation, sprint planning, and collaborative agile development with real-time voting.
							</p>
						</div>
					</div>

					{/* Action Cards */}
					<div className="grid md:grid-cols-2 gap-8 mb-16">
						<div className="group bg-card rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-primary/50">
							<div className="mb-6">
								<div className="bg-primary/10 rounded-xl w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
									<span className="text-2xl">🚀</span>
								</div>
								<h2 className="text-2xl font-bold mb-3 text-foreground">Start Planning Poker Game</h2>
								<p className="text-muted-foreground leading-relaxed">
									Create a new agile estimation session for your scrum team. Host your own planning poker game with real-time collaboration, story point voting, and team consensus building.
								</p>
							</div>
							<Button asChild size="lg" className="w-full text-lg py-3 rounded-xl">
								<Link to="/planning-poker/create">
									<span className="mr-2">✨</span>
									Create Session
								</Link>
							</Button>
						</div>

						<div className="group bg-card rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-secondary/50">
							<div className="mb-6">
								<div className="bg-secondary/10 rounded-xl w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
									<span className="text-2xl">🎯</span>
								</div>
								<h2 className="text-2xl font-bold mb-3 text-foreground">Join Poker Game</h2>
								<p className="text-muted-foreground leading-relaxed">
									Join an active planning poker game using your team's session code. Start estimating user stories and participate in agile sprint planning immediately!
								</p>
							</div>
							<Button asChild variant="outline" size="lg" className="w-full text-lg py-3 rounded-xl border-2 hover:bg-secondary/5">
								<Link to="/planning-poker/join">
									<span className="mr-2">🔗</span>
									Join Session
								</Link>
							</Button>
						</div>
					</div>

					{/* How it Works Section */}
					<div className="bg-gradient-to-r from-muted/30 to-muted/50 rounded-2xl p-8 mb-12">
						<div className="text-center mb-8">
							<h3 className="text-3xl font-bold mb-4 text-foreground">How Our Planning Poker Game Works</h3>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								Master agile estimation with our simple, effective scrum poker process in three easy steps
							</p>
						</div>
						<div className="grid md:grid-cols-3 gap-8">
							<div className="text-center group">
								<div className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
									<span className="text-2xl">🎮</span>
								</div>
								<h4 className="font-bold text-lg mb-3 text-foreground">Start Your Estimation Game</h4>
								<p className="text-muted-foreground leading-relaxed">
									Create an agile planning poker session or join with a session code. Share the game link with your scrum team instantly for collaborative estimation.
								</p>
							</div>
							<div className="text-center group">
								<div className="bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
									<span className="text-2xl">🃏</span>
								</div>
								<h4 className="font-bold text-lg mb-3 text-foreground">Play Scrum Poker Cards</h4>
								<p className="text-muted-foreground leading-relaxed">
									Vote on user stories using Fibonacci sequence planning poker cards. Estimate story points with beautiful flip animations and real-time team voting.
								</p>
							</div>
							<div className="text-center group">
								<div className="bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
									<span className="text-2xl">🤝</span>
								</div>
								<h4 className="font-bold text-lg mb-3 text-foreground">Achieve Team Consensus</h4>
								<p className="text-muted-foreground leading-relaxed">
									Discuss story point estimates and reach agile team consensus. Real-time updates keep everyone synchronized during sprint planning sessions.
								</p>
							</div>
						</div>
					</div>

					{/* Features Section */}
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border text-center hover:bg-card transition-colors">
							<div className="text-2xl mb-3">⚡</div>
							<h4 className="font-semibold mb-2">Real-time</h4>
							<p className="text-sm text-muted-foreground">Instant updates with SSE</p>
						</div>
						<div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border text-center hover:bg-card transition-colors">
							<div className="text-2xl mb-3">🎨</div>
							<h4 className="font-semibold mb-2">Beautiful UI</h4>
							<p className="text-sm text-muted-foreground">Smooth animations</p>
						</div>
						<div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border text-center hover:bg-card transition-colors">
							<div className="text-2xl mb-3">👥</div>
							<h4 className="font-semibold mb-2">Team Friendly</h4>
							<p className="text-sm text-muted-foreground">Easy collaboration</p>
						</div>
						<div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border text-center hover:bg-card transition-colors">
							<div className="text-2xl mb-3">🔒</div>
							<h4 className="font-semibold mb-2">Session Control</h4>
							<p className="text-sm text-muted-foreground">Lock & manage sessions</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
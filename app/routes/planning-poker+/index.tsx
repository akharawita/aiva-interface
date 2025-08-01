export default function PlanningPokerIndex() {
	return (
		<div className="container mx-auto px-4 py-12">
			<div className="text-center">
				<h1 className="text-4xl font-bold mb-8">🎯 Planning Poker Game</h1>
				<p className="text-xl mb-8">
					Agile estimation tool for scrum teams
				</p>
				<div className="space-y-4">
					<a 
						href="/planning-poker/create"
						className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
					>
						Create Session
					</a>
					<br />
					<a 
						href="/planning-poker/join"
						className="inline-block bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
					>
						Join Session
					</a>
				</div>
			</div>
		</div>
	)
}
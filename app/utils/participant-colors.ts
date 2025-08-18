// Unified color palette for both participant cards and vote distribution
const unifiedColors = [
	{ bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white' },
	{ bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white' },
	{ bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
	{ bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white' },
	{ bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white' },
	{ bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
	{ bg: 'bg-lime-500', border: 'border-lime-600', text: 'text-white' },
	{ bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-white' },
	{ bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
	{ bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
	{ bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white' },
	{ bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
]

// Generate a consistent random color based on a seed
function seededRandom(seed: string): number {
	let hash = 0
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32bit integer
	}
	return Math.abs(hash)
}

// Generate random color for items beyond the unified color palette
function generateRandomColor(seed: string): {
	bg: string
	border: string
	text: string
} {
	const seedValue = seededRandom(seed)

	// Color variations for random generation
	const hues = [
		'slate',
		'gray',
		'zinc',
		'neutral',
		'stone',
		'emerald',
		'sky',
		'violet',
		'fuchsia',
		'rose',
	]
	const intensities = ['400', '500', '600']

	const hueIndex = seedValue % hues.length
	const intensityIndex = (seedValue >> 8) % intensities.length

	const hue = hues[hueIndex]
	const intensity = intensities[intensityIndex]
	const borderIntensity =
		intensities[Math.min(intensityIndex + 1, intensities.length - 1)]

	return {
		bg: `bg-${hue}-${intensity}`,
		border: `border-${hue}-${borderIntensity}`,
		text: 'text-white',
	}
}

// Get color for any item based on index (used for both participants and vote distribution)
export function getColorByIndex(
	index: number,
	seed: string = '',
): { bg: string; border: string; text: string } {
	// Use unified colors for first 12 items
	if (index < unifiedColors.length) {
		return unifiedColors[index]!
	}

	// Generate random color for items beyond 12th
	return generateRandomColor(seed || index.toString())
}

// Convenience function for participant cards
export function getParticipantColor(
	index: number,
	participantId: string,
): { bg: string; border: string; text: string } {
	return getColorByIndex(index, participantId)
}

// Convenience function for vote distribution bars (returns only background color)
export function getDistributionBarColor(
	index: number,
	optionValue: string = '',
): string {
	const color = getColorByIndex(index, optionValue)
	return color.bg
}

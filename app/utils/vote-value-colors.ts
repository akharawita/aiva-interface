// Predefined colors for default vote values
const defaultVoteColors: Record<string, { bg: string; border: string; text: string }> = {
	'1': { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white' },
	'2': { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white' },
	'3': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
	'5': { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white' },
	'8': { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white' },
	'13': { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
	'21': { bg: 'bg-lime-500', border: 'border-lime-600', text: 'text-white' },
	'?': { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white' },
	'☕': { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
}

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

// Generate random color for custom vote values
function generateRandomColorForValue(value: string): {
	bg: string
	border: string
	text: string
} {
	const seedValue = seededRandom(value)

	// Extended color palette for random generation (avoiding colors used in defaults)
	const hues = [
		'rose', 'orange', 'yellow', 'emerald', 'sky', 
		'violet', 'fuchsia', 'slate', 'zinc', 'stone',
		'red', 'neutral', 'gray'
	]
	const intensities = ['400', '500', '600']

	const hueIndex = seedValue % hues.length
	const intensityIndex = (seedValue >> 8) % intensities.length

	const hue = hues[hueIndex]
	const intensity = intensities[intensityIndex]
	const borderIntensity = intensities[Math.min(intensityIndex + 1, intensities.length - 1)]

	return {
		bg: `bg-${hue}-${intensity}`,
		border: `border-${hue}-${borderIntensity}`,
		text: 'text-white',
	}
}

// Get color for a vote value
export function getVoteValueColor(value: string): { bg: string; border: string; text: string } {
	// Check if it's a default vote value
	if (defaultVoteColors[value]) {
		return defaultVoteColors[value]
	}
	
	// Generate consistent random color for custom values
	return generateRandomColorForValue(value)
}

// Get bar color for vote distribution
export function getVoteValueBarColor(value: string): string {
	const color = getVoteValueColor(value)
	return color.bg
}
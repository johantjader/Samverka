// Hash a string to a deterministic color
// Used for generating consistent colors for chat rooms, channels, etc.

const COLORS = [
    'from-rose-500 to-pink-600',
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-indigo-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
    'from-sky-500 to-indigo-600',
    'from-lime-600 to-green-600',
    'from-red-500 to-rose-600',
];

export function hashColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0; // Convert to 32-bit integer
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

// Get a single hex-like color for non-gradient contexts (e.g. text color, border)
const SOLID_COLORS = [
    'text-rose-600', 'text-violet-600', 'text-blue-600',
    'text-emerald-600', 'text-amber-600', 'text-indigo-600',
    'text-fuchsia-600', 'text-sky-600', 'text-lime-600', 'text-red-600',
];

export function hashTextColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    return SOLID_COLORS[Math.abs(hash) % SOLID_COLORS.length];
}

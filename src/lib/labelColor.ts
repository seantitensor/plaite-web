// 8-color palette picked to be readable on light backgrounds.
const PALETTE = [
	{ bg: 'rgba(59, 130, 246, 0.1)', fg: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' }, // blue
	{ bg: 'rgba(74, 155, 107, 0.12)', fg: '#2f6b4a', border: 'rgba(74, 155, 107, 0.3)' }, // green
	{ bg: 'rgba(217, 119, 6, 0.12)', fg: '#b45309', border: 'rgba(217, 119, 6, 0.3)' },  // amber
	{ bg: 'rgba(139, 92, 246, 0.12)', fg: '#6d28d9', border: 'rgba(139, 92, 246, 0.3)' }, // purple
	{ bg: 'rgba(236, 72, 153, 0.1)', fg: '#be185d', border: 'rgba(236, 72, 153, 0.25)' }, // pink
	{ bg: 'rgba(14, 165, 233, 0.1)', fg: '#0369a1', border: 'rgba(14, 165, 233, 0.25)' }, // cyan
	{ bg: 'rgba(220, 38, 38, 0.1)', fg: '#991b1b', border: 'rgba(220, 38, 38, 0.25)' },  // red
	{ bg: 'rgba(100, 116, 139, 0.12)', fg: '#334155', border: 'rgba(100, 116, 139, 0.25)' }, // slate
];

function hash(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = (h * 31 + str.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

export function labelColor(label: string): { bg: string; fg: string; border: string } {
	return PALETTE[hash(label.toLowerCase()) % PALETTE.length];
}

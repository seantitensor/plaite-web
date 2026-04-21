export function formatDuration(seconds: number): string {
	if (!seconds || seconds < 0) return '0s';
	const total = Math.round(seconds);
	const m = Math.floor(total / 60);
	const s = total % 60;
	if (m === 0) return `${s}s`;
	if (m < 60) return `${m}m ${s}s`;
	const h = Math.floor(m / 60);
	const remM = m % 60;
	return `${h}h ${remM}m`;
}

export function formatPercent(value: number, digits = 1): string {
	if (!isFinite(value)) return '—';
	return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number, digits = 1): string {
	if (!isFinite(n)) return '—';
	return n.toFixed(digits);
}

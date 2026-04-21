import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type Granularity = 'daily' | 'weekly' | 'monthly';

interface Props {
	title: string;
	data: Array<{ bucket: string; value: number }>;
	granularity: Granularity;
	color?: string;
	valueFormatter?: (v: number) => string;
	footnote?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Monday of ISO week N in the given year.
function isoWeekStart(year: number, week: number): Date {
	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4Dow = jan4.getUTCDay() || 7; // 1 (Mon) .. 7 (Sun)
	const week1Monday = new Date(jan4);
	week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));
	const target = new Date(week1Monday);
	target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
	return target;
}

function tickForBucket(bucket: string, g: Granularity): string {
	if (g === 'daily') {
		// "2024-03-12" → "Mar 12"
		const parts = bucket.split('-');
		if (parts.length !== 3) return bucket;
		const month = parseInt(parts[1], 10);
		const day = parseInt(parts[2], 10);
		return `${MONTHS[month - 1]} ${day}`;
	}
	if (g === 'weekly') {
		// "2024-W12" → "Mar 18" (Monday of that ISO week)
		const match = bucket.match(/^(\d{4})-W(\d{2})$/);
		if (!match) return bucket;
		const d = isoWeekStart(parseInt(match[1], 10), parseInt(match[2], 10));
		return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
	}
	// monthly "2024-03" → "Mar '24"
	const match = bucket.match(/^(\d{4})-(\d{2})$/);
	if (!match) return bucket;
	const month = parseInt(match[2], 10);
	return `${MONTHS[month - 1]} '${match[1].slice(2)}`;
}

export default function HistoryLineChart({
	title,
	data,
	granularity,
	color = '#4A9B6B',
	valueFormatter,
	footnote,
}: Props) {
	const hasData = data.length > 0 && data.some((d) => d.value !== 0);

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>{title}</h3>
			{!hasData ? (
				<p style={styles.empty}>No data in this range.</p>
			) : (
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
						<XAxis
							dataKey="bucket"
							fontSize={11}
							tick={{ fill: '#94a3b8' }}
							tickFormatter={(v: string) => tickForBucket(v, granularity)}
							minTickGap={24}
						/>
						<YAxis fontSize={11} tick={{ fill: '#94a3b8' }} />
						<Tooltip
							contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
							formatter={(value: number) => [valueFormatter ? valueFormatter(value) : value.toLocaleString(), title]}
							labelFormatter={(label: string) => label}
						/>
						<Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			)}
			{footnote && <div style={styles.footnote}>{footnote}</div>}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		background: '#fff',
		borderRadius: '12px',
		padding: '1.5rem',
		boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
		border: '1px solid #e2e8f0',
	},
	title: {
		fontSize: '1rem',
		fontWeight: 600,
		color: '#1e293b',
		marginBottom: '1rem',
	},
	empty: { color: '#94a3b8', fontSize: '0.9rem', padding: '2rem 0' },
	footnote: {
		fontSize: '0.72rem',
		color: '#94a3b8',
		marginTop: '0.5rem',
	},
};

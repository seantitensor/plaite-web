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

function isoWeekStart(year: number, week: number): Date {
	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4Dow = jan4.getUTCDay() || 7;
	const week1Monday = new Date(jan4);
	week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));
	const target = new Date(week1Monday);
	target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
	return target;
}

function tickForBucket(bucket: string, g: Granularity): string {
	if (g === 'daily') {
		const parts = bucket.split('-');
		if (parts.length !== 3) return bucket;
		const month = parseInt(parts[1], 10);
		const day = parseInt(parts[2], 10);
		return `${MONTHS[month - 1]} ${day}`;
	}
	if (g === 'weekly') {
		const match = bucket.match(/^(\d{4})-W(\d{2})$/);
		if (!match) return bucket;
		const d = isoWeekStart(parseInt(match[1], 10), parseInt(match[2], 10));
		return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
	}
	const match = bucket.match(/^(\d{4})-(\d{2})$/);
	if (!match) return bucket;
	const month = parseInt(match[2], 10);
	return `${MONTHS[month - 1]} '${match[1].slice(2)}`;
}

export default function HistoryLineChart({
	title,
	data,
	granularity,
	color = '#8b5a2b',
	valueFormatter,
	footnote,
}: Props) {
	const hasData = data.length > 0 && data.some((d) => d.value !== 0);
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">{title}</h3>
			{!hasData ? (
				<p className="font-mono text-[12px] text-muted py-8">No data in this range.</p>
			) : (
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#e8dfcf" />
						<XAxis
							dataKey="bucket"
							fontSize={11}
							tick={{ fill: '#7a6f5e' }}
							stroke="#e8dfcf"
							tickFormatter={(v: string) => tickForBucket(v, granularity)}
							minTickGap={24}
						/>
						<YAxis fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
						<Tooltip
							contentStyle={{ borderRadius: '6px', border: '1px solid #e8dfcf', fontSize: '12px', background: '#faf7f2' }}
							formatter={(value: number) => [valueFormatter ? valueFormatter(value) : value.toLocaleString(), title]}
							labelFormatter={(label: string) => label}
						/>
						<Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			)}
			{footnote && <div className="font-mono text-[11px] text-muted mt-2">{footnote}</div>}
		</div>
	);
}

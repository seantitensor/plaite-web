import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
	title: string;
	value: string;
	sub?: string;
	icon?: string;
	data: Array<{ x: string; y: number }>;
	color?: string;
}

export default function SparklineCard({ title, value, sub, data, color = '#9b4a3a' }: Props) {
	return (
		<div className="bg-surface border border-hairline rounded-lg p-5">
			<div className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">{title}</div>
			<div className="text-[38px] font-medium tracking-[-0.02em] leading-none text-ink mt-3 tabular-nums">{value}</div>
			{sub && <div className="font-mono text-[11px] text-muted mt-2">{sub}</div>}
			<div className="mt-2">
				<ResponsiveContainer width="100%" height={36}>
					<LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
						<Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

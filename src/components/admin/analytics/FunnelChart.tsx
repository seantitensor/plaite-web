import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Step { name: string; users: number }
interface Props { steps: Step[]; title?: string }

const COLORS = ['#8b5a2b', '#a67343', '#c49a6c', '#d9c4a6'];

export default function FunnelChart({ steps, title = 'Conversion funnel' }: Props) {
	if (steps.length === 0) {
		return (
			<div className="bg-surface border border-hairline rounded-lg p-6">
				<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">{title}</h3>
				<p className="font-mono text-[12px] text-muted">No funnel data available.</p>
			</div>
		);
	}
	const firstStep = steps[0]?.users || 1;
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">{title}</h3>
			<ResponsiveContainer width="100%" height={250}>
				<BarChart data={steps} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e8dfcf" />
					<XAxis type="number" fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
					<YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#7a6f5e' }} width={80} stroke="#e8dfcf" />
					<Tooltip
						formatter={(value: number) => [`${value.toLocaleString()} users (${Math.round((value / firstStep) * 100)}%)`, 'Users']}
						contentStyle={{ borderRadius: '6px', border: '1px solid #e8dfcf', fontSize: '12px', background: '#faf7f2' }}
					/>
					<Bar dataKey="users" radius={[0, 4, 4, 0]}>
						{steps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

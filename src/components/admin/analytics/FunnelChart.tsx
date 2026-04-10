import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Step {
	name: string;
	users: number;
}

interface Props {
	steps: Step[];
}

const COLORS = ['#4A9B6B', '#22c55e', '#86efac'];

export default function FunnelChart({ steps }: Props) {
	if (steps.length === 0) {
		return (
			<div style={styles.container}>
				<h3 style={styles.title}>Conversion Funnel</h3>
				<p style={styles.empty}>No funnel data available.</p>
			</div>
		);
	}

	const firstStep = steps[0]?.users || 1;

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Conversion Funnel</h3>
			<ResponsiveContainer width="100%" height={250}>
				<BarChart data={steps} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
					<XAxis type="number" fontSize={12} tick={{ fill: '#94a3b8' }} />
					<YAxis type="category" dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} width={80} />
					<Tooltip
						formatter={(value: number) => [
							`${value.toLocaleString()} users (${Math.round((value / firstStep) * 100)}%)`,
							'Users',
						]}
						contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
					/>
					<Bar dataKey="users" radius={[0, 4, 4, 0]}>
						{steps.map((_, i) => (
							<Cell key={i} fill={COLORS[i % COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
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
	empty: {
		color: '#94a3b8',
		fontSize: '0.9rem',
	},
};

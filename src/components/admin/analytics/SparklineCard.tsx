import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
	title: string;
	value: string;
	sub?: string;
	icon?: string;
	data: Array<{ x: string; y: number }>;
	color?: string;
}

export default function SparklineCard({ title, value, sub, icon, data, color = '#dc2626' }: Props) {
	return (
		<div style={styles.card}>
			{icon && <div style={styles.icon}>{icon}</div>}
			<div style={styles.value}>{value}</div>
			<div style={styles.title}>{title}</div>
			{sub && <div style={styles.sub}>{sub}</div>}
			<div style={styles.spark}>
				<ResponsiveContainer width="100%" height={36}>
					<LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
						<Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	card: {
		background: '#fff',
		borderRadius: '12px',
		padding: '1.5rem',
		boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
		border: '1px solid #e2e8f0',
	},
	icon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
	value: { fontSize: '2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 },
	title: { fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 },
	sub: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' },
	spark: { marginTop: '0.5rem' },
};

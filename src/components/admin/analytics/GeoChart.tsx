import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Country {
	country: string;
	users: number;
	sessions: number;
}

interface Props {
	countries: Country[];
}

export default function GeoChart({ countries }: Props) {
	const top10 = countries.slice(0, 10);

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Geographic Distribution</h3>
			{top10.length === 0 ? (
				<p style={styles.empty}>No geographic data available.</p>
			) : (
				<ResponsiveContainer width="100%" height={300}>
					<BarChart data={top10} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
						<XAxis dataKey="country" fontSize={11} tick={{ fill: '#64748b' }} angle={-30} textAnchor="end" height={60} />
						<YAxis fontSize={12} tick={{ fill: '#94a3b8' }} />
						<Tooltip
							contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
						/>
						<Bar dataKey="users" fill="#4A9B6B" radius={[4, 4, 0, 0]} name="Users" />
						<Bar dataKey="sessions" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Sessions" />
					</BarChart>
				</ResponsiveContainer>
			)}
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

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
	date: string;
	new: number;
	returning: number;
}

interface Props {
	data: DataPoint[];
}

function formatDate(dateStr: string) {
	if (!dateStr || dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export default function NewVsReturningChart({ data }: Props) {
	const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>New vs Returning Users</h3>
			{data.length === 0 ? (
				<p style={styles.empty}>No data in this range.</p>
			) : (
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
						<XAxis dataKey="date" fontSize={12} tick={{ fill: '#94a3b8' }} />
						<YAxis fontSize={12} tick={{ fill: '#94a3b8' }} />
						<Tooltip
							contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
						/>
						<Legend />
						<Area
							type="monotone"
							dataKey="returning"
							stackId="1"
							stroke="#4A9B6B"
							fill="#4A9B6B"
							fillOpacity={0.7}
							name="Returning"
						/>
						<Area
							type="monotone"
							dataKey="new"
							stackId="1"
							stroke="#3b82f6"
							fill="#3b82f6"
							fillOpacity={0.7}
							name="New"
						/>
					</AreaChart>
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
	empty: { color: '#94a3b8', fontSize: '0.9rem' },
};

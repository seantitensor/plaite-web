import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
	date: string;
	activeUsers: number;
	newUsers: number;
}

interface Props {
	data: DataPoint[];
}

function formatDate(dateStr: string) {
	if (!dateStr || dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export default function DauMauChart({ data }: Props) {
	const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Active Users</h3>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
					<XAxis dataKey="date" fontSize={12} tick={{ fill: '#94a3b8' }} />
					<YAxis fontSize={12} tick={{ fill: '#94a3b8' }} />
					<Tooltip
						contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
					/>
					<Legend />
					<Line type="monotone" dataKey="activeUsers" stroke="#4A9B6B" strokeWidth={2} dot={false} name="Active Users" />
					<Line type="monotone" dataKey="newUsers" stroke="#3b82f6" strokeWidth={2} dot={false} name="New Users" />
				</LineChart>
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
};

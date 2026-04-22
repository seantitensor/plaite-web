import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint { date: string; activeUsers: number; newUsers: number }
interface Props { data: DataPoint[] }

function formatDate(dateStr: string) {
	if (!dateStr || dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export default function DauMauChart({ data }: Props) {
	const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Active users</h3>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e8dfcf" />
					<XAxis dataKey="date" fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
					<YAxis fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
					<Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #e8dfcf', fontSize: '12px', background: '#faf7f2' }} />
					<Legend wrapperStyle={{ fontSize: '12px', color: '#7a6f5e' }} />
					<Line type="monotone" dataKey="activeUsers" stroke="#8b5a2b" strokeWidth={2} dot={false} name="Active Users" />
					<Line type="monotone" dataKey="newUsers" stroke="#3e5544" strokeWidth={2} dot={false} name="New Users" />
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

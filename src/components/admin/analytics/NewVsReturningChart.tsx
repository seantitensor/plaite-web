import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint { date: string; new: number; returning: number }
interface Props { data: DataPoint[] }

function formatDate(dateStr: string) {
	if (!dateStr || dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export default function NewVsReturningChart({ data }: Props) {
	const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">New vs returning users</h3>
			{data.length === 0 ? (
				<p className="font-mono text-[12px] text-muted">No data in this range.</p>
			) : (
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#e8dfcf" />
						<XAxis dataKey="date" fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
						<YAxis fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
						<Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #e8dfcf', fontSize: '12px', background: '#faf7f2' }} />
						<Legend wrapperStyle={{ fontSize: '12px' }} />
						<Area type="monotone" dataKey="returning" stackId="1" stroke="#3e5544" fill="#3e5544" fillOpacity={0.5} name="Returning" />
						<Area type="monotone" dataKey="new" stackId="1" stroke="#8b5a2b" fill="#8b5a2b" fillOpacity={0.5} name="New" />
					</AreaChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}

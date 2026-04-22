import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Country { country: string; users: number; sessions: number }
interface Props { countries: Country[] }

export default function GeoChart({ countries }: Props) {
	const top = countries.slice(0, 8);
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Geographic distribution</h3>
			{top.length === 0 ? (
				<p className="font-mono text-[12px] text-muted">No geographic data in this range.</p>
			) : (
				<ResponsiveContainer width="100%" height={280}>
					<BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#e8dfcf" />
						<XAxis type="number" fontSize={11} tick={{ fill: '#7a6f5e' }} stroke="#e8dfcf" />
						<YAxis type="category" dataKey="country" fontSize={11} tick={{ fill: '#7a6f5e' }} width={70} stroke="#e8dfcf" />
						<Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #e8dfcf', fontSize: '12px', background: '#faf7f2' }} />
						<Bar dataKey="users" fill="#8b5a2b" radius={[0, 4, 4, 0]} />
					</BarChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}

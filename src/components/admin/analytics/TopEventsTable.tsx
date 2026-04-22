interface Event { name: string; count: number; users: number }
interface Props { events: Event[] }

export default function TopEventsTable({ events }: Props) {
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6 overflow-auto">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Top events</h3>
			<table className="w-full border-collapse text-[13px]">
				<thead>
					<tr>
						<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Event</th>
						<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Count</th>
						<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Users</th>
					</tr>
				</thead>
				<tbody>
					{events.map((event, i) => (
						<tr key={event.name} className={i % 2 === 1 ? 'bg-canvas' : ''}>
							<td className="py-2 px-2 border-b border-hairline/60">
								<code className="font-mono text-[12px] bg-canvas text-ink px-1.5 py-0.5 rounded">{event.name}</code>
							</td>
							<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-ink tabular-nums">{event.count.toLocaleString()}</td>
							<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-muted tabular-nums">{event.users.toLocaleString()}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

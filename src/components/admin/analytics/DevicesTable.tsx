interface Device { os: string; sessions: number; users: number }
interface Props { devices: Device[] }

export default function DevicesTable({ devices }: Props) {
	const max = devices.reduce((m, d) => Math.max(m, d.sessions), 0) || 1;
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6 overflow-auto">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Operating systems</h3>
			{devices.length === 0 ? (
				<p className="font-mono text-[12px] text-muted">No device data.</p>
			) : (
				<table className="w-full border-collapse text-[13px]">
					<thead>
						<tr>
							<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">OS</th>
							<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Sessions</th>
							<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Users</th>
						</tr>
					</thead>
					<tbody>
						{devices.map((d, i) => (
							<tr key={d.os} className={i % 2 === 1 ? 'bg-canvas' : ''}>
								<td className="py-2 px-2 border-b border-hairline/60">
									<div className="flex flex-col gap-1 min-w-0">
										<span className="text-[13px] text-ink truncate">{d.os || '(unknown)'}</span>
										<div className="w-full h-[3px] bg-hairline rounded-full overflow-hidden">
											<div className="h-full bg-forest" style={{ width: `${(d.sessions / max) * 100}%` }} />
										</div>
									</div>
								</td>
								<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-ink tabular-nums">{d.sessions.toLocaleString()}</td>
								<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-muted tabular-nums">{d.users.toLocaleString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

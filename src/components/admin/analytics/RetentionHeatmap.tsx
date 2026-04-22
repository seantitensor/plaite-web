interface Props { cohorts: Record<string, Record<string, number>> }

function colorFor(value: number, base: number) {
	if (!base || !value) return 'rgba(232, 223, 207, 0.5)';
	const pct = value / base;
	const alpha = Math.max(0.1, Math.min(1, pct));
	return `rgba(139, 90, 43, ${alpha})`;
}

export default function RetentionHeatmap({ cohorts }: Props) {
	const entries = Object.entries(cohorts || {}).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length === 0) {
		return (
			<div className="bg-surface border border-hairline rounded-lg p-6">
				<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Retention cohorts</h3>
				<p className="font-mono text-[12px] text-muted">No retention data available.</p>
			</div>
		);
	}
	const DAYS = Array.from({ length: 14 }, (_, i) => String(i));
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6 overflow-auto">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Retention cohorts</h3>
			<table className="border-collapse text-[11px]">
				<thead>
					<tr>
						<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pr-3 pb-2 border-b border-hairline">Cohort</th>
						{DAYS.map((d) => (
							<th key={d} className="font-mono text-[10px] text-muted text-center px-1 pb-2 border-b border-hairline">D{d}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{entries.map(([cohort, row]) => {
						const base = row['0'] || 1;
						return (
							<tr key={cohort}>
								<td className="font-mono text-[11px] text-muted pr-3 py-0.5 whitespace-nowrap">{cohort}</td>
								{DAYS.map((d) => {
									const v = row[d] || 0;
									const pct = base > 0 ? Math.round((v / base) * 100) : 0;
									return (
										<td key={d} className="p-0">
											<div
												className="w-[36px] h-[22px] flex items-center justify-center rounded-sm font-mono text-[10px]"
												style={{ background: colorFor(v, base), color: pct > 50 ? '#fff' : '#2b251d' }}
												title={`${v} users (${pct}%)`}
											>
												{v > 0 ? `${pct}%` : ''}
											</div>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

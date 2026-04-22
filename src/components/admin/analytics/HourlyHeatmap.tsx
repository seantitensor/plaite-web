interface Props { grid: number[][] }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function colorFor(value: number, max: number) {
	if (value === 0 || max === 0) return 'rgba(232, 223, 207, 0.5)';
	const intensity = value / max;
	const alpha = Math.max(0.1, Math.min(1, intensity));
	return `rgba(62, 85, 68, ${alpha})`;
}

export default function HourlyHeatmap({ grid }: Props) {
	const max = grid.reduce((m, row) => row.reduce((mm, v) => Math.max(mm, v), m), 0);
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">Activity by hour <span className="font-mono not-italic text-[10px] uppercase tracking-[0.14em] text-muted">UTC</span></h3>
			{max === 0 ? (
				<p className="font-mono text-[12px] text-muted">No activity data in this range.</p>
			) : (
				<div className="flex flex-col gap-3">
					<div className="grid gap-[2px]" style={{ gridTemplateColumns: '32px repeat(24, 1fr)' }}>
						<div />
						{Array.from({ length: 24 }, (_, h) => (
							<div key={`hlabel-${h}`} className="font-mono text-[9px] text-muted text-center">
								{h % 6 === 0 ? String(h).padStart(2, '0') : ''}
							</div>
						))}
						{grid.map((row, dow) => (
							<div key={dow} className="contents">
								<div className="font-mono text-[10px] text-muted flex items-center">{DAYS[dow]}</div>
								{row.map((v, h) => (
									<div
										key={h}
										className="rounded-sm aspect-square min-h-[14px]"
										style={{ background: colorFor(v, max) }}
										title={`${DAYS[dow]} ${String(h).padStart(2, '0')}:00 · ${v} active`}
									/>
								))}
							</div>
						))}
					</div>
					<div className="flex items-center gap-1 self-end">
						<span className="font-mono text-[10px] text-muted mx-1">less</span>
						{[0.1, 0.25, 0.5, 0.75, 1].map((a, i) => (
							<div key={i} className="w-[14px] h-[14px] rounded-sm" style={{ background: `rgba(62, 85, 68, ${a})` }} />
						))}
						<span className="font-mono text-[10px] text-muted mx-1">more</span>
					</div>
				</div>
			)}
		</div>
	);
}

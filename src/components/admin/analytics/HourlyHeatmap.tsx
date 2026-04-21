interface Props {
	grid: number[][];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function colorFor(value: number, max: number) {
	if (value === 0 || max === 0) return '#f1f5f9';
	const intensity = value / max;
	const alpha = Math.max(0.08, Math.min(1, intensity));
	return `rgba(74, 155, 107, ${alpha})`;
}

export default function HourlyHeatmap({ grid }: Props) {
	const max = grid.reduce((m, row) => row.reduce((mm, v) => Math.max(mm, v), m), 0);

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Activity by Hour (UTC)</h3>
			{max === 0 ? (
				<p style={styles.empty}>No activity data in this range.</p>
			) : (
				<div style={styles.gridWrap}>
					<div style={styles.grid}>
						<div />
						{Array.from({ length: 24 }, (_, h) => (
							<div key={`hlabel-${h}`} style={styles.hourLabel}>
								{h % 6 === 0 ? String(h).padStart(2, '0') : ''}
							</div>
						))}

						{grid.map((row, dow) => (
							<div key={dow} style={{ display: 'contents' }}>
								<div style={styles.dayLabel}>{DAYS[dow]}</div>
								{row.map((v, h) => (
									<div
										key={h}
										style={{ ...styles.cell, background: colorFor(v, max) }}
										title={`${DAYS[dow]} ${String(h).padStart(2, '0')}:00 · ${v} active`}
									/>
								))}
							</div>
						))}
					</div>
					<div style={styles.legend}>
						<span style={styles.legendLabel}>less</span>
						{[0.08, 0.25, 0.5, 0.75, 1].map((a, i) => (
							<div
								key={i}
								style={{
									...styles.legendCell,
									background: `rgba(74, 155, 107, ${a})`,
								}}
							/>
						))}
						<span style={styles.legendLabel}>more</span>
					</div>
				</div>
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
	title: { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' },
	empty: { color: '#94a3b8', fontSize: '0.9rem' },
	gridWrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
	grid: {
		display: 'grid',
		gridTemplateColumns: '32px repeat(24, 1fr)',
		gap: '2px',
	},
	hourLabel: {
		fontSize: '0.65rem',
		color: '#94a3b8',
		textAlign: 'center',
		fontFamily: 'monospace',
	},
	dayLabel: {
		fontSize: '0.7rem',
		color: '#64748b',
		fontWeight: 500,
		display: 'flex',
		alignItems: 'center',
	},
	cell: {
		aspectRatio: '1 / 1',
		borderRadius: '2px',
		minHeight: '14px',
	},
	legend: {
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		fontSize: '0.7rem',
		color: '#94a3b8',
		alignSelf: 'flex-end',
	},
	legendLabel: { marginInline: '4px' },
	legendCell: { width: '14px', height: '14px', borderRadius: '2px' },
};

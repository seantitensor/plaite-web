interface Props {
	cohorts: Record<string, Record<string, number>>;
}

export default function RetentionHeatmap({ cohorts }: Props) {
	const cohortNames = Object.keys(cohorts).sort();
	if (cohortNames.length === 0) {
		return (
			<div style={styles.container}>
				<h3 style={styles.title}>Retention Cohorts</h3>
				<p style={styles.empty}>No retention data available for this period.</p>
			</div>
		);
	}

	const maxDays = Math.max(...cohortNames.flatMap((c) => Object.keys(cohorts[c]).map(Number)));
	const days = Array.from({ length: Math.min(maxDays + 1, 14) }, (_, i) => i);

	function getColor(rate: number) {
		if (rate >= 0.5) return '#166534';
		if (rate >= 0.3) return '#22c55e';
		if (rate >= 0.15) return '#86efac';
		if (rate >= 0.05) return '#dcfce7';
		return '#f1f5f9';
	}

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Retention Cohorts</h3>
			<div style={{ overflow: 'auto' }}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>Cohort</th>
							{days.map((d) => (
								<th key={d} style={{ ...styles.th, textAlign: 'center' }}>
									Day {d}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{cohortNames.slice(0, 10).map((name) => {
							const day0 = cohorts[name]['0'] || 1;
							return (
								<tr key={name}>
									<td style={styles.td}>{name}</td>
									{days.map((d) => {
										const users = cohorts[name][String(d)] || 0;
										const rate = day0 > 0 ? users / day0 : 0;
										return (
											<td
												key={d}
												style={{
													...styles.cell,
													background: getColor(rate),
													color: rate >= 0.3 ? '#fff' : '#334155',
												}}
											>
												{d === 0 ? users : `${Math.round(rate * 100)}%`}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
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
	empty: {
		color: '#94a3b8',
		fontSize: '0.9rem',
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: '0.8rem',
	},
	th: {
		padding: '0.5rem',
		borderBottom: '2px solid #e2e8f0',
		color: '#64748b',
		fontWeight: 600,
		fontSize: '0.7rem',
		textTransform: 'uppercase',
		whiteSpace: 'nowrap',
	},
	td: {
		padding: '0.5rem',
		borderBottom: '1px solid #f1f5f9',
		color: '#334155',
		fontSize: '0.75rem',
		whiteSpace: 'nowrap',
	},
	cell: {
		padding: '0.4rem',
		textAlign: 'center',
		borderBottom: '1px solid #f1f5f9',
		fontSize: '0.75rem',
		fontWeight: 600,
	},
};

interface Screen {
	screen: string;
	views: number;
	users: number;
}

interface Props {
	screens: Screen[];
}

export default function ScreenViewsTable({ screens }: Props) {
	const maxViews = screens.reduce((m, s) => Math.max(m, s.views), 0) || 1;

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Top Screens</h3>
			{screens.length === 0 ? (
				<div style={styles.empty}>No screen-view data in this range.</div>
			) : (
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>Screen</th>
							<th style={{ ...styles.th, textAlign: 'right' }}>Views</th>
							<th style={{ ...styles.th, textAlign: 'right' }}>Users</th>
						</tr>
					</thead>
					<tbody>
						{screens.map((s, i) => (
							<tr key={s.screen} style={i % 2 === 0 ? {} : { background: '#f8fafc' }}>
								<td style={styles.td}>
									<div style={styles.screenCell}>
										<code style={styles.code}>{s.screen}</code>
										<div style={styles.barTrack}>
											<div
												style={{
													...styles.barFill,
													width: `${(s.views / maxViews) * 100}%`,
												}}
											/>
										</div>
									</div>
								</td>
								<td style={{ ...styles.td, textAlign: 'right' }}>
									{s.views.toLocaleString()}
								</td>
								<td style={{ ...styles.td, textAlign: 'right' }}>
									{s.users.toLocaleString()}
								</td>
							</tr>
						))}
					</tbody>
				</table>
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
		overflow: 'auto',
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
		padding: '1rem 0',
	},
	table: {
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: '0.85rem',
	},
	th: {
		textAlign: 'left',
		padding: '0.6rem 0.75rem',
		borderBottom: '2px solid #e2e8f0',
		color: '#64748b',
		fontWeight: 600,
		fontSize: '0.75rem',
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
	},
	td: {
		padding: '0.6rem 0.75rem',
		borderBottom: '1px solid #f1f5f9',
		color: '#334155',
		verticalAlign: 'middle',
	},
	screenCell: {
		display: 'flex',
		flexDirection: 'column',
		gap: '0.35rem',
		minWidth: 0,
	},
	code: {
		background: '#f1f5f9',
		padding: '0.15rem 0.4rem',
		borderRadius: '4px',
		fontSize: '0.8rem',
		fontFamily: 'monospace',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		alignSelf: 'flex-start',
		maxWidth: '100%',
	},
	barTrack: {
		width: '100%',
		height: '4px',
		background: '#f1f5f9',
		borderRadius: '2px',
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		background: '#4A9B6B',
		borderRadius: '2px',
	},
};

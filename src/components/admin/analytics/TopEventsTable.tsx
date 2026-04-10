interface Event {
	name: string;
	count: number;
	users: number;
}

interface Props {
	events: Event[];
}

export default function TopEventsTable({ events }: Props) {
	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Top Events</h3>
			<table style={styles.table}>
				<thead>
					<tr>
						<th style={styles.th}>Event</th>
						<th style={{ ...styles.th, textAlign: 'right' }}>Count</th>
						<th style={{ ...styles.th, textAlign: 'right' }}>Users</th>
					</tr>
				</thead>
				<tbody>
					{events.map((event, i) => (
						<tr key={event.name} style={i % 2 === 0 ? {} : { background: '#f8fafc' }}>
							<td style={styles.td}>
								<code style={styles.code}>{event.name}</code>
							</td>
							<td style={{ ...styles.td, textAlign: 'right' }}>{event.count.toLocaleString()}</td>
							<td style={{ ...styles.td, textAlign: 'right' }}>{event.users.toLocaleString()}</td>
						</tr>
					))}
				</tbody>
			</table>
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
	},
	code: {
		background: '#f1f5f9',
		padding: '0.15rem 0.4rem',
		borderRadius: '4px',
		fontSize: '0.8rem',
		fontFamily: 'monospace',
	},
};

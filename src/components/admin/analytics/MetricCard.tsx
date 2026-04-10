interface Props {
	title: string;
	value: number | string;
	icon?: string;
}

export default function MetricCard({ title, value, icon }: Props) {
	const formatted = typeof value === 'number' ? value.toLocaleString() : value;

	return (
		<div style={styles.card}>
			{icon && <div style={styles.icon}>{icon}</div>}
			<div style={styles.value}>{formatted}</div>
			<div style={styles.title}>{title}</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	card: {
		background: '#fff',
		borderRadius: '12px',
		padding: '1.5rem',
		boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
		border: '1px solid #e2e8f0',
	},
	icon: {
		fontSize: '1.5rem',
		marginBottom: '0.5rem',
	},
	value: {
		fontSize: '2rem',
		fontWeight: 700,
		color: '#1e293b',
		lineHeight: 1.2,
	},
	title: {
		fontSize: '0.85rem',
		color: '#64748b',
		marginTop: '0.25rem',
		fontWeight: 500,
	},
};

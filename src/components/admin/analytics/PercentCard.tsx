interface Props {
	title: string;
	numerator: number;
	denominator: number;
	icon?: string;
	tone?: 'neutral' | 'bad';
	numeratorLabel?: string;
	denominatorLabel?: string;
}

export default function PercentCard({
	title,
	numerator,
	denominator,
	icon,
	tone = 'neutral',
	numeratorLabel,
	denominatorLabel,
}: Props) {
	const rate = denominator > 0 ? numerator / denominator : 0;
	const pct = `${(rate * 100).toFixed(1)}%`;
	const color = tone === 'bad' && rate > 0 ? '#dc2626' : '#1e293b';

	return (
		<div style={styles.card}>
			{icon && <div style={styles.icon}>{icon}</div>}
			<div style={{ ...styles.value, color }}>{pct}</div>
			<div style={styles.title}>{title}</div>
			<div style={styles.sub}>
				{numerator.toLocaleString()} {numeratorLabel || ''} of {denominator.toLocaleString()}{' '}
				{denominatorLabel || ''}
			</div>
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
	icon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
	value: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
	title: { fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 },
	sub: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' },
};

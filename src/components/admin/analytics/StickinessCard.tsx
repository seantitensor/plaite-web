import { formatPercent } from '../../../lib/format';

interface Props {
	dau: number;
	mau: number;
}

export default function StickinessCard({ dau, mau }: Props) {
	const ratio = mau > 0 ? dau / mau : 0;

	return (
		<div style={styles.card}>
			<div style={styles.icon}>🔥</div>
			<div style={styles.value}>{formatPercent(ratio, 0)}</div>
			<div style={styles.title}>Stickiness</div>
			<div style={styles.sub}>DAU / MAU · {dau.toLocaleString()} of {mau.toLocaleString()}</div>
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
	sub: {
		fontSize: '0.75rem',
		color: '#94a3b8',
		marginTop: '0.25rem',
	},
};

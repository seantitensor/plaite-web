import { useEffect, useState } from 'react';

export default function RealtimeBadge() {
	const [users, setUsers] = useState<number | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function fetchOnce() {
			try {
				const res = await fetch('/api/admin/analytics/realtime');
				if (!res.ok) throw new Error('bad status');
				const body = await res.json();
				if (!cancelled) {
					setUsers(body.users ?? 0);
					setError(false);
				}
			} catch {
				if (!cancelled) setError(true);
			}
		}

		fetchOnce();
		const id = setInterval(fetchOnce, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	const dotColor = error ? '#94a3b8' : users && users > 0 ? '#22c55e' : '#cbd5e1';

	return (
		<div style={styles.pill} title="Active users right now">
			<span style={{ ...styles.dot, background: dotColor }} />
			<span style={styles.text}>
				{error ? '—' : users === null ? '…' : users.toLocaleString()}{' '}
				<span style={styles.muted}>live</span>
			</span>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	pill: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '0.5rem',
		padding: '0.4rem 0.75rem',
		borderRadius: '999px',
		background: '#f8fafc',
		border: '1px solid #e2e8f0',
		fontSize: '0.8rem',
		fontWeight: 500,
		color: '#1e293b',
	},
	dot: {
		width: '8px',
		height: '8px',
		borderRadius: '50%',
		boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.6)',
		animation: 'rt-pulse 1.8s ease-in-out infinite',
	},
	text: { whiteSpace: 'nowrap' },
	muted: { color: '#94a3b8', fontWeight: 400 },
};

// Inject keyframes once per page.
if (typeof document !== 'undefined' && !document.getElementById('rt-badge-kf')) {
	const style = document.createElement('style');
	style.id = 'rt-badge-kf';
	style.textContent = `@keyframes rt-pulse {
		0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
		70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
		100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
	}`;
	document.head.appendChild(style);
}

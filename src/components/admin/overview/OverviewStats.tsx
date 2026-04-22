import { useEffect, useState } from 'react';

interface Overview {
	daily: any[];
	totals: { activeUsers?: number };
}
interface Crashes {
	totals: { rate: number; crashes: number; sessions: number };
}
interface MessagesResp {
	messages: Array<{ responded?: boolean }>;
}

export default function OverviewStats() {
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState<Overview | null>(null);
	const [crashes, setCrashes] = useState<Crashes | null>(null);
	const [unresponded, setUnresponded] = useState<number | null>(null);
	const [liveUsers, setLiveUsers] = useState<number | null>(null);
	const [liveError, setLiveError] = useState(false);

	// One-shot fetches on mount.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [ovRes, crRes, msgRes] = await Promise.allSettled([
				fetch('/api/admin/analytics/overview?startDate=30daysAgo&endDate=today').then((r) => r.json()),
				fetch('/api/admin/analytics/crashes?startDate=7daysAgo&endDate=today').then((r) => r.json()),
				fetch('/api/admin/messages').then((r) => r.json()),
			]);
			if (cancelled) return;
			if (ovRes.status === 'fulfilled' && !ovRes.value.error) setOverview(ovRes.value);
			if (crRes.status === 'fulfilled' && !crRes.value.error) setCrashes(crRes.value);
			if (msgRes.status === 'fulfilled' && !msgRes.value.error) {
				const list = (msgRes.value as MessagesResp).messages || [];
				setUnresponded(list.filter((m) => !m.responded).length);
			}
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Realtime polling — matches RealtimeBadge pattern.
	useEffect(() => {
		let cancelled = false;
		async function tick() {
			try {
				const res = await fetch('/api/admin/analytics/realtime');
				if (!res.ok) throw new Error('bad status');
				const body = await res.json();
				if (!cancelled) {
					setLiveUsers(body.users ?? 0);
					setLiveError(false);
				}
			} catch {
				if (!cancelled) setLiveError(true);
			}
		}
		tick();
		const id = setInterval(tick, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	const dau = overview?.daily?.[overview.daily.length - 1]?.dau;
	const active30d = overview?.totals?.activeUsers;
	const crashRate = crashes?.totals?.rate;
	const crashRateHigh = typeof crashRate === 'number' && crashRate > 0.01;

	return (
		<div style={styles.grid}>
			<div style={styles.card}>
				<div style={styles.headerRow}>
					<span style={styles.cardTitle}>Live users</span>
					<span
						style={{
							...styles.dot,
							background: liveError ? '#94a3b8' : liveUsers && liveUsers > 0 ? '#22c55e' : '#cbd5e1',
						}}
					/>
				</div>
				<div style={styles.value}>
					{liveError ? '—' : liveUsers === null ? '…' : liveUsers.toLocaleString()}
				</div>
				<div style={styles.sub}>right now</div>
			</div>

			<div style={styles.card}>
				<div style={styles.cardTitle}>DAU today</div>
				<div style={styles.value}>
					{loading ? '…' : typeof dau === 'number' ? dau.toLocaleString() : '—'}
				</div>
				<div style={styles.sub}>1-day active users</div>
			</div>

			<div style={styles.card}>
				<div style={styles.cardTitle}>30-day active</div>
				<div style={styles.value}>
					{loading ? '…' : typeof active30d === 'number' ? active30d.toLocaleString() : '—'}
				</div>
				<div style={styles.sub}>unique users, last 30d</div>
			</div>

			<div style={styles.card}>
				<div style={styles.cardTitle}>Crash rate · 7d</div>
				<div style={{ ...styles.value, color: crashRateHigh ? '#dc2626' : '#1e293b' }}>
					{loading
						? '…'
						: typeof crashRate === 'number'
							? `${(crashRate * 100).toFixed(2)}%`
							: '—'}
				</div>
				<div style={styles.sub}>
					{crashes
						? `${crashes.totals.crashes.toLocaleString()} of ${crashes.totals.sessions.toLocaleString()} sessions`
						: ''}
				</div>
			</div>

			<div style={styles.card}>
				<div style={styles.cardTitle}>Unresponded</div>
				<div
					style={{
						...styles.value,
						color: unresponded && unresponded > 0 ? '#b45309' : '#1e293b',
					}}
				>
					{loading ? '…' : unresponded === null ? '—' : unresponded.toLocaleString()}
				</div>
				<div style={styles.sub}>
					<a href="/admin/messages" style={styles.link}>
						{unresponded && unresponded > 0 ? 'Open messages →' : 'All caught up'}
					</a>
				</div>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
		gap: '1rem',
		marginBottom: '2rem',
	},
	card: {
		background: '#fff',
		borderRadius: '12px',
		padding: '1.1rem 1.25rem',
		border: '1px solid #e2e8f0',
		boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
	},
	headerRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardTitle: {
		fontSize: '0.75rem',
		fontWeight: 600,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
	},
	value: {
		fontSize: '1.75rem',
		fontWeight: 700,
		color: '#1e293b',
		marginTop: '0.25rem',
		lineHeight: 1.15,
	},
	sub: {
		fontSize: '0.72rem',
		color: '#94a3b8',
		marginTop: '0.35rem',
	},
	dot: {
		width: '8px',
		height: '8px',
		borderRadius: '50%',
		display: 'inline-block',
	},
	link: {
		color: '#4A9B6B',
		textDecoration: 'none',
		fontWeight: 500,
	},
};

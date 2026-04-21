import { useEffect, useMemo, useState } from 'react';
import HistoryRangePicker, { HISTORY_PRESETS, type HistoryRange } from './HistoryRangePicker';
import HistoryLineChart, { type Granularity } from './HistoryLineChart';
import CumulativeUsersChart from './CumulativeUsersChart';
import { formatDuration, formatNumber } from '../../../lib/format';

interface UserBucket {
	bucket: string;
	activeUsers: number;
	mau: number;
	newUsers: number;
}
interface SessionBucket {
	bucket: string;
	sessions: number;
	screenPageViews: number;
	avgSessionDuration: number;
	sessionsPerUser: number;
}
interface CrashBucket {
	bucket: string;
	crashes: number;
	sessions: number;
	rate: number;
}
interface AuthBucket {
	bucket: string;
	failures: number;
	sessionStarts: number;
	rate: number;
}

// Mirror of computeGranularity in analytics.ts — compute client-side so x-axis
// formatting stays correct even if a fetch fails.
function clientGranularity(startDate: string): Granularity {
	if (startDate === '30daysAgo' || startDate === '90daysAgo') return 'daily';
	if (startDate === '365daysAgo') return 'weekly';
	// Absolute YYYY-MM-DD (All time preset) → monthly.
	return 'monthly';
}

export default function HistoryDashboard() {
	const [activeRange, setActiveRange] = useState<HistoryRange>(HISTORY_PRESETS[0]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [userBuckets, setUserBuckets] = useState<UserBucket[]>([]);
	const [sessionBuckets, setSessionBuckets] = useState<SessionBucket[]>([]);
	const [crashBuckets, setCrashBuckets] = useState<CrashBucket[]>([]);
	const [authBuckets, setAuthBuckets] = useState<AuthBucket[]>([]);

	const granularity = useMemo<Granularity>(
		() => clientGranularity(activeRange.startDate),
		[activeRange],
	);

	useEffect(() => {
		async function fetchAll() {
			setLoading(true);
			setError('');
			const params = `?startDate=${activeRange.startDate}&endDate=${activeRange.endDate}`;

			try {
				const results = await Promise.allSettled([
					fetch(`/api/admin/analytics/history/users${params}`).then((r) => r.json()),
					fetch(`/api/admin/analytics/history/sessions${params}`).then((r) => r.json()),
					fetch(`/api/admin/analytics/history/crashes${params}`).then((r) => r.json()),
					fetch(`/api/admin/analytics/history/auth-failures${params}`).then((r) => r.json()),
				]);

				const ok = (r: PromiseSettledResult<any>) =>
					r.status === 'fulfilled' && !r.value.error ? r.value : null;

				const u = ok(results[0]); setUserBuckets(u?.buckets || []);
				const s = ok(results[1]); setSessionBuckets(s?.buckets || []);
				const c = ok(results[2]); setCrashBuckets(c?.buckets || []);
				const a = ok(results[3]); setAuthBuckets(a?.buckets || []);
			} catch (err: any) {
				setError(err.message || 'Failed to load history');
			} finally {
				setLoading(false);
			}
		}
		fetchAll();
	}, [activeRange]);

	// Derived series for charts 3/8/9/10/11.
	const activeSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.activeUsers }));
	const mauSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.mau }));
	const stickinessSeries = userBuckets.map((b) => ({
		bucket: b.bucket,
		value: b.mau > 0 ? (b.activeUsers / b.mau) * 100 : 0,
	}));
	const newUsersSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.newUsers }));
	const sessionsSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.sessions }));
	const screenSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.screenPageViews }));
	const durationSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.avgSessionDuration }));
	const spuSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.sessionsPerUser }));
	const crashRateSeries = crashBuckets.map((b) => ({ bucket: b.bucket, value: (b.rate || 0) * 100 }));
	const authRateSeries = authBuckets.map((b) => ({ bucket: b.bucket, value: (b.rate || 0) * 100 }));

	return (
		<div>
			<div style={styles.header}>
				<h1 style={styles.pageTitle}>History</h1>
				<HistoryRangePicker value={activeRange.label} onChange={setActiveRange} />
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.loading}>Loading history data...</div>
			) : (
				<div style={styles.stack}>
					<CumulativeUsersChart userBuckets={userBuckets} granularity={granularity} />
					<HistoryLineChart title="Active Users per bucket" data={activeSeries} granularity={granularity} />
					<HistoryLineChart title="MAU (28-day active)" data={mauSeries} granularity={granularity} color="#8b5cf6" />
					<HistoryLineChart
						title="Stickiness (Active / MAU)"
						data={stickinessSeries}
						granularity={granularity}
						color="#f59e0b"
						valueFormatter={(v) => `${v.toFixed(1)}%`}
					/>
					<HistoryLineChart title="New Users" data={newUsersSeries} granularity={granularity} color="#3b82f6" />
					<HistoryLineChart title="Sessions" data={sessionsSeries} granularity={granularity} />
					<HistoryLineChart title="Screen Views" data={screenSeries} granularity={granularity} color="#0ea5e9" />
					<HistoryLineChart
						title="Avg Session Duration"
						data={durationSeries}
						granularity={granularity}
						color="#14b8a6"
						valueFormatter={(v) => formatDuration(v)}
					/>
					<HistoryLineChart
						title="Sessions per User"
						data={spuSeries}
						granularity={granularity}
						color="#a855f7"
						valueFormatter={(v) => formatNumber(v)}
					/>
					<HistoryLineChart
						title="Crash Rate"
						data={crashRateSeries}
						granularity={granularity}
						color="#dc2626"
						valueFormatter={(v) => `${v.toFixed(2)}%`}
					/>
					<HistoryLineChart
						title="Auth Failure Rate"
						data={authRateSeries}
						granularity={granularity}
						color="#ef4444"
						valueFormatter={(v) => `${v.toFixed(2)}%`}
					/>
				</div>
			)}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: '1.5rem',
		gap: '1rem',
		flexWrap: 'wrap',
	},
	pageTitle: {
		fontSize: '1.5rem',
		fontWeight: 700,
		color: '#1e293b',
	},
	error: {
		background: '#fef2f2',
		color: '#dc2626',
		padding: '1rem',
		borderRadius: '8px',
		marginBottom: '1rem',
		fontSize: '0.9rem',
	},
	loading: {
		textAlign: 'center',
		padding: '4rem',
		color: '#94a3b8',
		fontSize: '1rem',
	},
	stack: {
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
	},
};

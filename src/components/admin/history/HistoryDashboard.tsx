import { useEffect, useMemo, useState } from 'react';
import HistoryRangePicker, { HISTORY_PRESETS, type HistoryRange } from './HistoryRangePicker';
import HistoryLineChart, { type Granularity } from './HistoryLineChart';
import CumulativeUsersChart from './CumulativeUsersChart';
import { formatDuration, formatNumber } from '../../../lib/format';

interface UserBucket { bucket: string; activeUsers: number; mau: number; newUsers: number }
interface SessionBucket { bucket: string; sessions: number; screenPageViews: number; avgSessionDuration: number; sessionsPerUser: number }
interface CrashBucket { bucket: string; crashes: number; sessions: number; rate: number }
interface AuthBucket { bucket: string; failures: number; sessionStarts: number; rate: number }

function clientGranularity(startDate: string): Granularity {
	if (startDate === '30daysAgo' || startDate === '90daysAgo') return 'daily';
	if (startDate === '365daysAgo') return 'weekly';
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

	const granularity = useMemo<Granularity>(() => clientGranularity(activeRange.startDate), [activeRange]);

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

	const activeSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.activeUsers }));
	const mauSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.mau }));
	const stickinessSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.mau > 0 ? (b.activeUsers / b.mau) * 100 : 0 }));
	const newUsersSeries = userBuckets.map((b) => ({ bucket: b.bucket, value: b.newUsers }));
	const sessionsSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.sessions }));
	const screenSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.screenPageViews }));
	const durationSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.avgSessionDuration }));
	const spuSeries = sessionBuckets.map((b) => ({ bucket: b.bucket, value: b.sessionsPerUser }));
	const crashRateSeries = crashBuckets.map((b) => ({ bucket: b.bucket, value: (b.rate || 0) * 100 }));
	const authRateSeries = authBuckets.map((b) => ({ bucket: b.bucket, value: (b.rate || 0) * 100 }));

	return (
		<div>
			<header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70 mb-2">History</p>
					<h1 className="italic text-[44px] font-light tracking-[-0.03em] leading-none text-ink">
						Trends over time.
					</h1>
				</div>
				<HistoryRangePicker value={activeRange.label} onChange={setActiveRange} />
			</header>

			{error && (
				<div className="bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-4 py-3 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div className="font-mono text-[12px] text-muted text-center py-16">Loading history…</div>
			) : (
				<div className="flex flex-col gap-4">
					<CumulativeUsersChart userBuckets={userBuckets} granularity={granularity} />
					<HistoryLineChart title="Active users per bucket" data={activeSeries} granularity={granularity} color="#8b5a2b" />
					<HistoryLineChart title="MAU (28-day active)" data={mauSeries} granularity={granularity} color="#3e5544" />
					<HistoryLineChart title="Stickiness (active / MAU)" data={stickinessSeries} granularity={granularity} color="#c49a6c" valueFormatter={(v) => `${v.toFixed(1)}%`} />
					<HistoryLineChart title="New users" data={newUsersSeries} granularity={granularity} color="#8b5a2b" />
					<HistoryLineChart title="Sessions" data={sessionsSeries} granularity={granularity} color="#3e5544" />
					<HistoryLineChart title="Screen views" data={screenSeries} granularity={granularity} color="#8b5a2b" />
					<HistoryLineChart title="Avg session duration" data={durationSeries} granularity={granularity} color="#3e5544" valueFormatter={(v) => formatDuration(v)} />
					<HistoryLineChart title="Sessions per user" data={spuSeries} granularity={granularity} color="#c49a6c" valueFormatter={(v) => formatNumber(v)} />
					<HistoryLineChart title="Crash rate" data={crashRateSeries} granularity={granularity} color="#9b4a3a" valueFormatter={(v) => `${v.toFixed(2)}%`} />
					<HistoryLineChart title="Auth failure rate" data={authRateSeries} granularity={granularity} color="#9b4a3a" valueFormatter={(v) => `${v.toFixed(2)}%`} />
				</div>
			)}
		</div>
	);
}

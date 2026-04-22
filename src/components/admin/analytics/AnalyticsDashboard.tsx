import { useState, useEffect } from 'react';
import DateRangePicker from './DateRangePicker';
import MetricCard from './MetricCard';
import StickinessCard from './StickinessCard';
import SparklineCard from './SparklineCard';
import PercentCard from './PercentCard';
import DauMauChart from './DauMauChart';
import TopEventsTable from './TopEventsTable';
import ScreenViewsTable from './ScreenViewsTable';
import RetentionHeatmap from './RetentionHeatmap';
import FunnelChart from './FunnelChart';
import GeoChart from './GeoChart';
import NewVsReturningChart from './NewVsReturningChart';
import HourlyHeatmap from './HourlyHeatmap';
import VersionsTable from './VersionsTable';
import DevicesTable from './DevicesTable';
import RealtimeBadge from './RealtimeBadge';
import { formatDuration, formatNumber } from '../../../lib/format';

export default function AnalyticsDashboard() {
	const [range, setRange] = useState('30daysAgo');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [overview, setOverview] = useState<any>(null);
	const [events, setEvents] = useState<any[]>([]);
	const [retention, setRetention] = useState<any>({});
	const [funnel, setFunnel] = useState<any[]>([]);
	const [geo, setGeo] = useState<any[]>([]);
	const [screens, setScreens] = useState<any[]>([]);
	const [crashes, setCrashes] = useState<any>(null);
	const [authFail, setAuthFail] = useState<any>(null);
	const [discoverFunnel, setDiscoverFunnel] = useState<any[]>([]);
	const [newVsReturning, setNewVsReturning] = useState<any[]>([]);
	const [versions, setVersions] = useState<any[]>([]);
	const [devices, setDevices] = useState<any[]>([]);
	const [hourly, setHourly] = useState<number[][]>([]);

	useEffect(() => { fetchAll(); }, [range]);

	async function fetchAll() {
		setLoading(true);
		setError('');
		const params = `?startDate=${range}&endDate=today`;
		try {
			const results = await Promise.allSettled([
				fetch(`/api/admin/analytics/overview${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/events${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/retention${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/funnels${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/geo${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/screens${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/crashes${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/auth-failures${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/discover-funnel${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/new-vs-returning${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/versions${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/devices${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/hourly${params}`).then((r) => r.json()),
			]);
			const ok = (r: PromiseSettledResult<any>) =>
				r.status === 'fulfilled' && !r.value.error ? r.value : null;

			const o = ok(results[0]); if (o) setOverview(o);
			const e = ok(results[1]); if (e) setEvents(e.events || []);
			const rt = ok(results[2]); if (rt) setRetention(rt.cohorts || {});
			const f = ok(results[3]); if (f) setFunnel(f.steps || []);
			const g = ok(results[4]); if (g) setGeo(g.countries || []);
			const s = ok(results[5]); if (s) setScreens(s.screens || []);
			const c = ok(results[6]); if (c) setCrashes(c);
			const af = ok(results[7]); if (af) setAuthFail(af);
			const df = ok(results[8]); if (df) setDiscoverFunnel(df.steps || []);
			const nvr = ok(results[9]); if (nvr) setNewVsReturning(nvr.daily || []);
			const v = ok(results[10]); if (v) setVersions(v.versions || []);
			const d = ok(results[11]); if (d) setDevices(d.devices || []);
			const h = ok(results[12]); if (h) setHourly(h.grid || []);
		} catch (err: any) {
			setError(err.message || 'Failed to load analytics');
		} finally {
			setLoading(false);
		}
	}

	const totals = overview?.totals || {};
	const daily = overview?.daily || [];
	const avgSessionDuration = totals.avgSessionDuration || 0;
	const avgSessionsPerUser = totals.sessionsPerUser || 0;
	const latestDay = daily[daily.length - 1];
	const dau = latestDay?.dau || 0;
	const mau = latestDay?.mau || 0;

	const rangeLabel =
		range === '7daysAgo' ? 'Last 7 days' :
		range === '30daysAgo' ? 'Last 30 days' :
		range === '90daysAgo' ? 'Last 90 days' :
		'Selected range';

	return (
		<div>
			<header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70 mb-2">Analytics</p>
					<h1 className="italic text-[44px] font-light tracking-[-0.03em] leading-none text-ink">
						How the app is performing.
					</h1>
				</div>
				<RealtimeBadge />
			</header>

			{error && (
				<div className="bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-4 py-3 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div className="font-mono text-[12px] text-muted text-center py-16">Loading analytics…</div>
			) : (
				<>
					{/* Today strip */}
					<section className="mb-10">
						<SectionLabel title="Today" hint="Current snapshot — not affected by the date range" />
						<div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
							<MetricCard title="DAU (today)" value={dau} />
							<MetricCard title="MAU (28 days)" value={mau} />
							<StickinessCard dau={dau} mau={mau} />
						</div>
					</section>

					{/* Range header with picker */}
					<div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
						<div>
							<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70">{rangeLabel}</p>
							<p className="text-[13px] text-muted">All metrics below are filtered by the selected range.</p>
						</div>
						<DateRangePicker value={range} onChange={setRange} />
					</div>

					{/* Volume */}
					<div className="grid grid-cols-4 gap-3 mb-3 max-lg:grid-cols-2 max-md:grid-cols-1">
						<MetricCard title="Active users" value={totals.activeUsers || 0} />
						<MetricCard title="New users" value={totals.newUsers || 0} />
						<MetricCard title="Sessions" value={totals.sessions || 0} />
						<MetricCard title="Screen views" value={totals.screenViews || 0} />
					</div>

					{/* Engagement */}
					<div className="grid grid-cols-4 gap-3 mb-8 max-lg:grid-cols-2 max-md:grid-cols-1">
						<MetricCard title="Avg session duration" value={formatDuration(avgSessionDuration)} />
						<MetricCard title="Sessions / user" value={formatNumber(avgSessionsPerUser)} />
						<SparklineCard
							title="Crash rate"
							value={crashes ? `${((crashes.totals.rate || 0) * 100).toFixed(2)}%` : '—'}
							sub={crashes ? `${crashes.totals.crashes.toLocaleString()} of ${crashes.totals.sessions.toLocaleString()} sessions` : undefined}
							data={(crashes?.daily || []).map((d: any) => ({ x: d.date, y: d.crashes }))}
							color="#9b4a3a"
						/>
						<PercentCard
							title="Auth failure rate"
							numerator={authFail?.failures || 0}
							denominator={authFail?.sessionStarts || 0}
							numeratorLabel="failures"
							denominatorLabel="session starts"
							tone="bad"
						/>
					</div>

					{/* DAU/MAU + Top events */}
					<div className="flex gap-4 mb-4 max-lg:flex-col">
						<div className="flex-[2] flex flex-col gap-4 min-w-0">
							<DauMauChart data={daily} />
							<ScreenViewsTable screens={screens} />
						</div>
						<div className="flex-1 min-w-0">
							<TopEventsTable events={events} />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
						<NewVsReturningChart data={newVsReturning} />
						<HourlyHeatmap grid={hourly} />
					</div>

					<div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
						<FunnelChart steps={discoverFunnel} title="Discover loop" />
						<FunnelChart steps={funnel} title="Core conversion" />
					</div>

					<div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
						<GeoChart countries={geo} />
						<VersionsTable versions={versions} />
					</div>

					<div className="mb-4">
						<DevicesTable devices={devices} />
					</div>

					<div>
						<RetentionHeatmap cohorts={retention} />
					</div>
				</>
			)}
		</div>
	);
}

function SectionLabel({ title, hint }: { title: string; hint: string }) {
	return (
		<div className="flex items-baseline gap-3 flex-wrap mb-3">
			<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink font-medium">{title}</span>
			<span className="text-[12.5px] text-muted">{hint}</span>
		</div>
	);
}

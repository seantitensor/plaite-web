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

	useEffect(() => {
		fetchAll();
	}, [range]);

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

	// Derived values from existing overview data.
	const totals = overview?.totals || {};
	const daily = overview?.daily || [];
	// Use range-scoped values from the server (distinct over the range, not
	// per-day arithmetic means) — `avgSessionDuration` and `sessionsPerUser`
	// now live on `totals`.
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
			<div style={styles.header}>
				<h1 style={styles.pageTitle}>Analytics</h1>
				<div style={styles.headerRight}>
					<RealtimeBadge />
				</div>
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.loading}>Loading analytics data...</div>
			) : (
				<>
					{/* ---- TODAY strip (current-state, not range-filtered) ---- */}
					<div style={styles.sectionHeader}>
						<span style={styles.sectionTitle}>Today</span>
						<span style={styles.sectionHint}>Current snapshot — not affected by the date range</span>
					</div>
					<div style={{ ...styles.metricsGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
						<MetricCard title="DAU (today)" value={dau} icon="☀️" />
						<MetricCard title="MAU (28 days)" value={mau} icon="🌙" />
						<StickinessCard dau={dau} mau={mau} />
					</div>

					{/* ---- RANGE-FILTERED section ---- */}
					<div style={{ ...styles.sectionHeader, ...styles.rangeHeader, marginTop: '2rem' }}>
						<div style={styles.rangeHeaderLeft}>
							<span style={styles.sectionTitle}>{rangeLabel}</span>
							<span style={styles.sectionHint}>All metrics below are filtered by the selected range</span>
						</div>
						<DateRangePicker value={range} onChange={setRange} />
					</div>

					{/* Volume */}
					<div style={styles.metricsGrid}>
						<MetricCard title="Active Users" value={totals.activeUsers || 0} icon="👥" />
						<MetricCard title="New Users" value={totals.newUsers || 0} icon="🆕" />
						<MetricCard title="Sessions" value={totals.sessions || 0} icon="📊" />
						<MetricCard title="Screen Views" value={totals.screenViews || 0} icon="📱" />
					</div>

					{/* Engagement & quality */}
					<div style={styles.metricsGrid}>
						<MetricCard
							title="Avg Session Duration"
							value={formatDuration(avgSessionDuration)}
							icon="⏱️"
						/>
						<MetricCard
							title="Sessions / User"
							value={formatNumber(avgSessionsPerUser)}
							icon="🔁"
						/>
						<SparklineCard
							title="Crash Rate"
							value={
								crashes
									? `${((crashes.totals.rate || 0) * 100).toFixed(2)}%`
									: '—'
							}
							sub={
								crashes
									? `${crashes.totals.crashes.toLocaleString()} of ${crashes.totals.sessions.toLocaleString()} sessions`
									: undefined
							}
							icon="💥"
							data={(crashes?.daily || []).map((d: any) => ({ x: d.date, y: d.crashes }))}
							color="#dc2626"
						/>
						<PercentCard
							title="Auth Failure Rate"
							icon="🔐"
							numerator={authFail?.failures || 0}
							denominator={authFail?.sessionStarts || 0}
							numeratorLabel="failures"
							denominatorLabel="session starts"
							tone="bad"
						/>
					</div>

					{/* DAU/MAU + Top Events */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
							<DauMauChart data={daily} />
							<ScreenViewsTable screens={screens} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<TopEventsTable events={events} />
						</div>
					</div>

					{/* New vs Returning + Hourly */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 1, minWidth: 0 }}>
							<NewVsReturningChart data={newVsReturning} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<HourlyHeatmap grid={hourly} />
						</div>
					</div>

					{/* Funnels */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 1, minWidth: 0 }}>
							<FunnelChart steps={discoverFunnel} title="Discover Loop" />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<FunnelChart steps={funnel} title="Core Conversion" />
						</div>
					</div>

					{/* Geo + Versions */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 1, minWidth: 0 }}>
							<GeoChart countries={geo} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<VersionsTable versions={versions} />
						</div>
					</div>

					{/* Devices */}
					<div style={{ marginTop: '1.5rem' }}>
						<DevicesTable devices={devices} />
					</div>

					{/* Retention */}
					<div style={{ marginTop: '1.5rem' }}>
						<RetentionHeatmap cohorts={retention} />
					</div>
				</>
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
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
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
	metricsGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(4, 1fr)',
		gap: '1rem',
		marginBottom: '1rem',
	},
	sectionHeader: {
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.75rem',
		marginBottom: '0.75rem',
		flexWrap: 'wrap',
	},
	rangeHeader: {
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	rangeHeaderLeft: {
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.75rem',
		flexWrap: 'wrap',
	},
	sectionTitle: {
		fontSize: '0.7rem',
		fontWeight: 700,
		color: '#1e293b',
		textTransform: 'uppercase',
		letterSpacing: '0.08em',
	},
	sectionHint: {
		fontSize: '0.75rem',
		color: '#94a3b8',
	},
	chartsRow: {
		display: 'flex',
		gap: '1.5rem',
		marginTop: '1.5rem',
	},
};

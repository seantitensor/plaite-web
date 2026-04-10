import { useState, useEffect } from 'react';
import DateRangePicker from './DateRangePicker';
import MetricCard from './MetricCard';
import DauMauChart from './DauMauChart';
import TopEventsTable from './TopEventsTable';
import RetentionHeatmap from './RetentionHeatmap';
import FunnelChart from './FunnelChart';
import GeoChart from './GeoChart';

export default function AnalyticsDashboard() {
	const [range, setRange] = useState('30daysAgo');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [overview, setOverview] = useState<any>(null);
	const [events, setEvents] = useState<any[]>([]);
	const [retention, setRetention] = useState<any>({});
	const [funnel, setFunnel] = useState<any[]>([]);
	const [geo, setGeo] = useState<any[]>([]);

	useEffect(() => {
		fetchAll();
	}, [range]);

	async function fetchAll() {
		setLoading(true);
		setError('');

		const params = `?startDate=${range}&endDate=today`;

		try {
			const [overviewRes, eventsRes, retentionRes, funnelRes, geoRes] = await Promise.allSettled([
				fetch(`/api/admin/analytics/overview${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/events${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/retention${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/funnels${params}`).then((r) => r.json()),
				fetch(`/api/admin/analytics/geo${params}`).then((r) => r.json()),
			]);

			if (overviewRes.status === 'fulfilled' && !overviewRes.value.error) {
				setOverview(overviewRes.value);
			}
			if (eventsRes.status === 'fulfilled' && !eventsRes.value.error) {
				setEvents(eventsRes.value.events || []);
			}
			if (retentionRes.status === 'fulfilled' && !retentionRes.value.error) {
				setRetention(retentionRes.value.cohorts || {});
			}
			if (funnelRes.status === 'fulfilled' && !funnelRes.value.error) {
				setFunnel(funnelRes.value.steps || []);
			}
			if (geoRes.status === 'fulfilled' && !geoRes.value.error) {
				setGeo(geoRes.value.countries || []);
			}
		} catch (err: any) {
			setError(err.message || 'Failed to load analytics');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<div style={styles.header}>
				<h1 style={styles.pageTitle}>Analytics</h1>
				<DateRangePicker value={range} onChange={setRange} />
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.loading}>Loading analytics data...</div>
			) : (
				<>
					{/* Metric Cards */}
					<div style={styles.metricsGrid}>
						<MetricCard title="Active Users" value={overview?.totals?.activeUsers || 0} icon="👥" />
						<MetricCard title="New Users" value={overview?.totals?.newUsers || 0} icon="🆕" />
						<MetricCard title="Sessions" value={overview?.totals?.sessions || 0} icon="📊" />
						<MetricCard title="Screen Views" value={overview?.totals?.screenViews || 0} icon="📱" />
					</div>

					{/* Charts Row */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 2 }}>
							<DauMauChart data={overview?.daily || []} />
						</div>
						<div style={{ flex: 1 }}>
							<TopEventsTable events={events} />
						</div>
					</div>

					{/* Second Row */}
					<div style={styles.chartsRow}>
						<div style={{ flex: 1 }}>
							<GeoChart countries={geo} />
						</div>
						<div style={{ flex: 1 }}>
							<FunnelChart steps={funnel} />
						</div>
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
		marginBottom: '1.5rem',
	},
	chartsRow: {
		display: 'flex',
		gap: '1.5rem',
		marginTop: '1.5rem',
	},
};

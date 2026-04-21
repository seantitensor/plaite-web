import { BetaAnalyticsDataClient } from '@google-analytics/data';

let client: BetaAnalyticsDataClient | null = null;

function getClient() {
	if (client) return client;

	// Astro exposes .env via import.meta.env, not process.env — pass keyFilename
	// explicitly so the SDK doesn't fall back to GCE metadata server.
	client = new BetaAnalyticsDataClient({
		keyFilename: import.meta.env.GOOGLE_APPLICATION_CREDENTIALS,
	});
	return client;
}

const propertyId = () => import.meta.env.GA_PROPERTY_ID;

/**
 * Range-scoped distinct totals.
 * GA4 `activeUsers` with no `date` dimension = unique users across the range
 * (no double-counting). We also grab the true range-scoped sessionsPerUser
 * and averageSessionDuration so the dashboard cards don't approximate them
 * by averaging daily values.
 */
export async function getOverviewTotals(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [
			{ name: 'activeUsers' },
			{ name: 'newUsers' },
			{ name: 'sessions' },
			{ name: 'screenPageViews' },
			{ name: 'averageSessionDuration' },
			{ name: 'sessionsPerUser' },
		],
	});
	const row = response.rows?.[0]?.metricValues || [];
	return {
		activeUsers: Number(row[0]?.value || 0),
		newUsers: Number(row[1]?.value || 0),
		sessions: Number(row[2]?.value || 0),
		screenViews: Number(row[3]?.value || 0),
		avgSessionDuration: Number(row[4]?.value || 0),
		sessionsPerUser: Number(row[5]?.value || 0),
	};
}

export async function getActiveUsers(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [
			{ name: 'activeUsers' },
			{ name: 'active1DayUsers' },
			{ name: 'active28DayUsers' },
			{ name: 'newUsers' },
		],
		dimensions: [{ name: 'date' }],
		orderBys: [{ dimension: { dimensionName: 'date' } }],
	});
	return response;
}

export async function getSessions(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [
			{ name: 'sessions' },
			{ name: 'averageSessionDuration' },
			{ name: 'sessionsPerUser' },
			{ name: 'screenPageViews' },
		],
		dimensions: [{ name: 'date' }],
		orderBys: [{ dimension: { dimensionName: 'date' } }],
	});
	return response;
}

export async function getTopEvents(startDate: string, endDate: string, limit = 20) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
		dimensions: [{ name: 'eventName' }],
		orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
		limit,
	});
	return response;
}

/**
 * Convert a GA4 relative date ("30daysAgo", "today") to YYYY-MM-DD.
 * Cohort reports require absolute dates.
 */
export function toAbsoluteDate(input: string): string {
	if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

	const now = new Date();
	if (input === 'today') return now.toISOString().slice(0, 10);
	if (input === 'yesterday') {
		now.setUTCDate(now.getUTCDate() - 1);
		return now.toISOString().slice(0, 10);
	}
	const match = input.match(/^(\d+)daysAgo$/);
	if (match) {
		now.setUTCDate(now.getUTCDate() - parseInt(match[1], 10));
		return now.toISOString().slice(0, 10);
	}
	return now.toISOString().slice(0, 10);
}

export async function getRetentionCohorts(startDate: string, endDate: string) {
	// Cohort requests: dateRanges must be empty, cohort dateRange requires absolute YYYY-MM-DD
	const absStart = toAbsoluteDate(startDate);
	const absEnd = toAbsoluteDate(endDate);

	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		metrics: [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }],
		dimensions: [
			{ name: 'cohort' },
			{ name: 'cohortNthDay' },
		],
		cohortSpec: {
			cohorts: [
				{
					name: 'cohort',
					dimension: 'firstSessionDate',
					dateRange: { startDate: absStart, endDate: absEnd },
				},
			],
			cohortsRange: {
				granularity: 'DAILY' as any,
				startOffset: 0,
				endOffset: 13,
			},
		},
	});
	return response;
}

export async function getGeoDistribution(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
		dimensions: [{ name: 'country' }],
		orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
		limit: 30,
	});
	return response;
}

export async function getScreenViews(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
		dimensions: [{ name: 'unifiedScreenName' }],
		orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
		limit: 20,
	});
	return response;
}

/**
 * Approximate a funnel by running multiple event-count reports.
 * GA4's official runFunnelReport is not in the Beta Data API - we'd need the Alpha API.
 * Instead, we query user counts for each funnel-step event and compute drop-off manually.
 */
export async function getFunnelData(startDate: string, endDate: string) {
	const funnelEvents = [
		{ name: 'App Open', event: 'session_start' },
		{ name: 'View Screen', event: 'screen_view' },
		{ name: 'Save Recipe', event: 'save_recipe' },
	];
	return runFunnel(startDate, endDate, funnelEvents);
}

async function runFunnel(
	startDate: string,
	endDate: string,
	funnelEvents: Array<{ name: string; event: string }>,
) {
	const steps: Array<{ name: string; users: number }> = [];
	for (const step of funnelEvents) {
		const [response] = await getClient().runReport({
			property: `properties/${propertyId()}`,
			dateRanges: [{ startDate, endDate }],
			metrics: [{ name: 'totalUsers' }],
			dimensionFilter: {
				filter: {
					fieldName: 'eventName',
					stringFilter: { value: step.event },
				},
			},
		});
		const users = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
		steps.push({ name: step.name, users });
	}
	return { steps };
}

export async function getDiscoverFunnel(startDate: string, endDate: string) {
	return runFunnel(startDate, endDate, [
		{ name: 'Discover Screen', event: 'Discover_ScreenViewed' },
		{ name: 'Swiped', event: 'Discover_RecipeSwiped' },
		{ name: 'Recipe Viewed', event: 'Recipe_Viewed' },
		{ name: 'Saved', event: 'save_recipe' },
	]);
}

async function countEvent(startDate: string, endDate: string, eventName: string): Promise<number> {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'eventCount' }],
		dimensionFilter: {
			filter: {
				fieldName: 'eventName',
				stringFilter: { value: eventName },
			},
		},
	});
	return Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
}

export async function getCrashesDaily(startDate: string, endDate: string) {
	const [dailyResp, totalsResp] = await Promise.all([
		getClient().runReport({
			property: `properties/${propertyId()}`,
			dateRanges: [{ startDate, endDate }],
			metrics: [{ name: 'eventCount' }],
			dimensions: [{ name: 'date' }],
			dimensionFilter: {
				filter: {
					fieldName: 'eventName',
					stringFilter: { value: 'app_exception' },
				},
			},
			orderBys: [{ dimension: { dimensionName: 'date' } }],
		}),
		getClient().runReport({
			property: `properties/${propertyId()}`,
			dateRanges: [{ startDate, endDate }],
			metrics: [{ name: 'sessions' }],
		}),
	]);

	const daily = (dailyResp[0].rows || []).map((row) => ({
		date: row.dimensionValues?.[0]?.value || '',
		crashes: Number(row.metricValues?.[0]?.value || 0),
	}));

	const crashes = daily.reduce((sum, d) => sum + d.crashes, 0);
	const sessions = Number(totalsResp[0].rows?.[0]?.metricValues?.[0]?.value || 0);
	const rate = sessions > 0 ? crashes / sessions : 0;

	return { daily, totals: { crashes, sessions, rate } };
}

export async function getAuthFailures(startDate: string, endDate: string) {
	const [failures, sessionStarts] = await Promise.all([
		countEvent(startDate, endDate, 'StartView_authentication_Fail'),
		countEvent(startDate, endDate, 'session_start'),
	]);
	const rate = sessionStarts > 0 ? failures / sessionStarts : 0;
	return { failures, sessionStarts, rate };
}

export async function getNewVsReturning(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'activeUsers' }],
		dimensions: [{ name: 'date' }, { name: 'newVsReturning' }],
		orderBys: [{ dimension: { dimensionName: 'date' } }],
	});

	const byDate: Record<string, { date: string; new: number; returning: number }> = {};
	for (const row of response.rows || []) {
		const date = row.dimensionValues?.[0]?.value || '';
		const type = row.dimensionValues?.[1]?.value || '';
		const users = Number(row.metricValues?.[0]?.value || 0);
		if (!byDate[date]) byDate[date] = { date, new: 0, returning: 0 };
		if (type === 'new') byDate[date].new = users;
		else if (type === 'returning') byDate[date].returning = users;
	}
	const daily = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
	return { daily };
}

export async function getAppVersions(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
		dimensions: [{ name: 'appVersion' }],
		orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
		limit: 10,
	});
	return response;
}

export async function getDevices(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
		dimensions: [{ name: 'operatingSystemWithVersion' }],
		orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
		limit: 10,
	});
	return response;
}

export async function getHourlyActivity(startDate: string, endDate: string) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'activeUsers' }],
		dimensions: [{ name: 'dayOfWeek' }, { name: 'hour' }],
	});

	// Build a 7x24 grid (Sunday=0 ... Saturday=6, hours 00..23)
	const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
	for (const row of response.rows || []) {
		const dow = parseInt(row.dimensionValues?.[0]?.value || '0', 10);
		const hour = parseInt(row.dimensionValues?.[1]?.value || '0', 10);
		const users = Number(row.metricValues?.[0]?.value || 0);
		if (dow >= 0 && dow < 7 && hour >= 0 && hour < 24) {
			grid[dow][hour] = users;
		}
	}
	return { grid };
}

// -------- History / long-horizon helpers --------

export type Granularity = 'daily' | 'weekly' | 'monthly';

export function computeGranularity(startDate: string, endDate: string): Granularity {
	const start = new Date(toAbsoluteDate(startDate) + 'T00:00:00Z').getTime();
	const end = new Date(toAbsoluteDate(endDate) + 'T00:00:00Z').getTime();
	const days = Math.max(0, Math.round((end - start) / 86400000));
	if (days <= 90) return 'daily';
	if (days <= 365) return 'weekly';
	return 'monthly';
}

function isoWeekFromDate(d: Date): { year: number; week: number } {
	// Thursday-based ISO week, per ISO 8601.
	const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
	const dayNum = target.getUTCDay() || 7;
	target.setUTCDate(target.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { year: target.getUTCFullYear(), week };
}

export function enumerateBuckets(startDate: string, endDate: string, g: Granularity): string[] {
	const start = new Date(toAbsoluteDate(startDate) + 'T00:00:00Z');
	const end = new Date(toAbsoluteDate(endDate) + 'T00:00:00Z');
	const keys: string[] = [];

	if (g === 'daily') {
		const cur = new Date(start);
		while (cur <= end) {
			keys.push(cur.toISOString().slice(0, 10));
			cur.setUTCDate(cur.getUTCDate() + 1);
		}
	} else if (g === 'weekly') {
		const seen = new Set<string>();
		const cur = new Date(start);
		while (cur <= end) {
			const { year, week } = isoWeekFromDate(cur);
			const key = `${year}-W${String(week).padStart(2, '0')}`;
			if (!seen.has(key)) {
				seen.add(key);
				keys.push(key);
			}
			cur.setUTCDate(cur.getUTCDate() + 1);
		}
	} else {
		const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
		while (cur <= end) {
			const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
			keys.push(key);
			cur.setUTCMonth(cur.getUTCMonth() + 1);
		}
	}

	return keys;
}

function buildBucketKey(g: Granularity, dimValues: string[]): string {
	if (g === 'daily') {
		const v = dimValues[0] || '';
		return v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v;
	}
	if (g === 'weekly') {
		const year = dimValues[0] || '';
		const week = String(parseInt(dimValues[1] || '0', 10)).padStart(2, '0');
		return `${year}-W${week}`;
	}
	const year = dimValues[0] || '';
	const month = String(parseInt(dimValues[1] || '0', 10)).padStart(2, '0');
	return `${year}-${month}`;
}

function dimsFor(g: Granularity) {
	if (g === 'daily') return [{ name: 'date' }];
	if (g === 'weekly') return [{ name: 'isoYear' }, { name: 'isoWeek' }];
	return [{ name: 'year' }, { name: 'month' }];
}

function orderBysFor(g: Granularity) {
	if (g === 'daily') return [{ dimension: { dimensionName: 'date' } }];
	if (g === 'weekly') {
		return [
			{ dimension: { dimensionName: 'isoYear' } },
			{ dimension: { dimensionName: 'isoWeek' } },
		];
	}
	return [
		{ dimension: { dimensionName: 'year' } },
		{ dimension: { dimensionName: 'month' } },
	];
}

export async function getHistoryUsers(startDate: string, endDate: string, g: Granularity) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		// NOTE: use activeUsers (distinct over bucket) — active1DayUsers is incompatible
		// with non-daily time dimensions.
		metrics: [
			{ name: 'activeUsers' },
			{ name: 'active28DayUsers' },
			{ name: 'newUsers' },
		],
		dimensions: dimsFor(g),
		orderBys: orderBysFor(g),
	});

	const scaffold = enumerateBuckets(startDate, endDate, g);
	const byBucket: Record<string, { activeUsers: number; mau: number; newUsers: number }> = {};
	for (const row of response.rows || []) {
		const dimVals = (row.dimensionValues || []).map((dv) => dv.value || '');
		const key = buildBucketKey(g, dimVals);
		byBucket[key] = {
			activeUsers: Number(row.metricValues?.[0]?.value || 0),
			mau: Number(row.metricValues?.[1]?.value || 0),
			newUsers: Number(row.metricValues?.[2]?.value || 0),
		};
	}

	return scaffold.map((bucket) => ({
		bucket,
		activeUsers: byBucket[bucket]?.activeUsers || 0,
		mau: byBucket[bucket]?.mau || 0,
		newUsers: byBucket[bucket]?.newUsers || 0,
	}));
}

export async function getHistorySessions(startDate: string, endDate: string, g: Granularity) {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [
			{ name: 'sessions' },
			{ name: 'screenPageViews' },
			{ name: 'averageSessionDuration' },
			{ name: 'sessionsPerUser' },
		],
		dimensions: dimsFor(g),
		orderBys: orderBysFor(g),
	});

	const scaffold = enumerateBuckets(startDate, endDate, g);
	const byBucket: Record<string, any> = {};
	for (const row of response.rows || []) {
		const dimVals = (row.dimensionValues || []).map((dv) => dv.value || '');
		const key = buildBucketKey(g, dimVals);
		byBucket[key] = {
			sessions: Number(row.metricValues?.[0]?.value || 0),
			screenPageViews: Number(row.metricValues?.[1]?.value || 0),
			avgSessionDuration: Number(row.metricValues?.[2]?.value || 0),
			sessionsPerUser: Number(row.metricValues?.[3]?.value || 0),
		};
	}

	return scaffold.map((bucket) => ({
		bucket,
		sessions: byBucket[bucket]?.sessions || 0,
		screenPageViews: byBucket[bucket]?.screenPageViews || 0,
		avgSessionDuration: byBucket[bucket]?.avgSessionDuration || 0,
		sessionsPerUser: byBucket[bucket]?.sessionsPerUser || 0,
	}));
}

async function bucketedEventCount(
	startDate: string,
	endDate: string,
	g: Granularity,
	eventName: string,
): Promise<Record<string, number>> {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'eventCount' }],
		dimensions: dimsFor(g),
		dimensionFilter: {
			filter: {
				fieldName: 'eventName',
				stringFilter: { value: eventName },
			},
		},
		orderBys: orderBysFor(g),
	});

	const byBucket: Record<string, number> = {};
	for (const row of response.rows || []) {
		const dimVals = (row.dimensionValues || []).map((dv) => dv.value || '');
		const key = buildBucketKey(g, dimVals);
		byBucket[key] = Number(row.metricValues?.[0]?.value || 0);
	}
	return byBucket;
}

async function bucketedSessions(
	startDate: string,
	endDate: string,
	g: Granularity,
): Promise<Record<string, number>> {
	const [response] = await getClient().runReport({
		property: `properties/${propertyId()}`,
		dateRanges: [{ startDate, endDate }],
		metrics: [{ name: 'sessions' }],
		dimensions: dimsFor(g),
		orderBys: orderBysFor(g),
	});

	const byBucket: Record<string, number> = {};
	for (const row of response.rows || []) {
		const dimVals = (row.dimensionValues || []).map((dv) => dv.value || '');
		const key = buildBucketKey(g, dimVals);
		byBucket[key] = Number(row.metricValues?.[0]?.value || 0);
	}
	return byBucket;
}

export async function getHistoryCrashes(startDate: string, endDate: string, g: Granularity) {
	const [crashesByBucket, sessionsByBucket] = await Promise.all([
		bucketedEventCount(startDate, endDate, g, 'app_exception'),
		bucketedSessions(startDate, endDate, g),
	]);

	const scaffold = enumerateBuckets(startDate, endDate, g);
	return scaffold.map((bucket) => {
		const crashes = crashesByBucket[bucket] || 0;
		const sessions = sessionsByBucket[bucket] || 0;
		const rate = sessions > 0 ? crashes / sessions : 0;
		return { bucket, crashes, sessions, rate };
	});
}

export async function getHistoryAuthFailures(startDate: string, endDate: string, g: Granularity) {
	const [failuresByBucket, sessionStartsByBucket] = await Promise.all([
		bucketedEventCount(startDate, endDate, g, 'StartView_authentication_Fail'),
		bucketedEventCount(startDate, endDate, g, 'session_start'),
	]);

	const scaffold = enumerateBuckets(startDate, endDate, g);
	return scaffold.map((bucket) => {
		const failures = failuresByBucket[bucket] || 0;
		const sessionStarts = sessionStartsByBucket[bucket] || 0;
		const rate = sessionStarts > 0 ? failures / sessionStarts : 0;
		return { bucket, failures, sessionStarts, rate };
	});
}

export async function getRealtimeActiveUsers() {
	const [response] = await getClient().runRealtimeReport({
		property: `properties/${propertyId()}`,
		metrics: [{ name: 'activeUsers' }],
	});
	const users = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
	return { users };
}

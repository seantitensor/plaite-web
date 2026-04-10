import { BetaAnalyticsDataClient } from '@google-analytics/data';

let client: BetaAnalyticsDataClient | null = null;

function getClient() {
	if (client) return client;

	// Auto-detects credentials from GOOGLE_APPLICATION_CREDENTIALS env var
	client = new BetaAnalyticsDataClient();
	return client;
}

const propertyId = () => import.meta.env.GA_PROPERTY_ID;

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
function toAbsoluteDate(input: string): string {
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

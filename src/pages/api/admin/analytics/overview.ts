import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getActiveUsers, getSessions } = await import('../../../../lib/firebase/analytics');

		const [usersResponse, sessionsResponse] = await Promise.all([
			getActiveUsers(startDate, endDate),
			getSessions(startDate, endDate),
		]);

		const dailyData: Record<string, any> = {};

		for (const row of usersResponse.rows || []) {
			const date = row.dimensionValues?.[0]?.value || '';
			dailyData[date] = {
				date,
				activeUsers: Number(row.metricValues?.[0]?.value || 0),
				dau: Number(row.metricValues?.[1]?.value || 0),
				mau: Number(row.metricValues?.[2]?.value || 0),
				newUsers: Number(row.metricValues?.[3]?.value || 0),
			};
		}

		for (const row of sessionsResponse.rows || []) {
			const date = row.dimensionValues?.[0]?.value || '';
			if (!dailyData[date]) dailyData[date] = { date };
			dailyData[date].sessions = Number(row.metricValues?.[0]?.value || 0);
			dailyData[date].avgSessionDuration = Number(row.metricValues?.[1]?.value || 0);
			dailyData[date].sessionsPerUser = Number(row.metricValues?.[2]?.value || 0);
			dailyData[date].screenViews = Number(row.metricValues?.[3]?.value || 0);
		}

		const daily = Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));

		// Compute totals
		const totals = daily.reduce(
			(acc: any, d: any) => ({
				activeUsers: acc.activeUsers + (d.activeUsers || 0),
				newUsers: acc.newUsers + (d.newUsers || 0),
				sessions: acc.sessions + (d.sessions || 0),
				screenViews: acc.screenViews + (d.screenViews || 0),
			}),
			{ activeUsers: 0, newUsers: 0, sessions: 0, screenViews: 0 },
		);

		return new Response(JSON.stringify({ daily, totals }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

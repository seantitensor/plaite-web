import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { getActiveUsers, getSessions, getOverviewTotals } from '../../../../lib/firebase/analytics';
import { env } from "cloudflare:workers";

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const [usersResponse, sessionsResponse, totals] = await Promise.all([
			getActiveUsers(startDate, endDate, env),
			getSessions(startDate, endDate, env),
			getOverviewTotals(startDate, endDate, env),
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

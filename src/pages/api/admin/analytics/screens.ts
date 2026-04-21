import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getScreenViews } = await import('../../../../lib/firebase/analytics');
		const response = await getScreenViews(startDate, endDate);

		const screens = (response.rows || []).map((row) => ({
			screen: row.dimensionValues?.[0]?.value || '(unknown)',
			views: Number(row.metricValues?.[0]?.value || 0),
			users: Number(row.metricValues?.[1]?.value || 0),
		}));

		return new Response(JSON.stringify({ screens }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

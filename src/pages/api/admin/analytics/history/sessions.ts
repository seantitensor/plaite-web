import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getHistorySessions, computeGranularity } = await import('../../../../../lib/firebase/analytics');
		const granularity = computeGranularity(startDate, endDate);
		const buckets = await getHistorySessions(startDate, endDate, granularity);
		return new Response(JSON.stringify({ granularity, buckets }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

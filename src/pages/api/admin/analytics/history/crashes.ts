import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';
import { getHistoryCrashes, computeGranularity } from '../../../../../lib/firebase/analytics';
import { env } from "cloudflare:workers";

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const granularity = computeGranularity(startDate, endDate);
		const buckets = await getHistoryCrashes(startDate, endDate, granularity, env);
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

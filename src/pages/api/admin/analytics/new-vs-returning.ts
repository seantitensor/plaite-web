import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getNewVsReturning } = await import('../../../../lib/firebase/analytics');
		const { daily } = await getNewVsReturning(startDate, endDate);
		return new Response(JSON.stringify({ daily }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

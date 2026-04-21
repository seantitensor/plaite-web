import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { url } = ctx;
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getAppVersions } = await import('../../../../lib/firebase/analytics');
		const response = await getAppVersions(startDate, endDate);
		const versions = (response.rows || []).map((row) => ({
			version: row.dimensionValues?.[0]?.value || '(unknown)',
			sessions: Number(row.metricValues?.[0]?.value || 0),
			users: Number(row.metricValues?.[1]?.value || 0),
		}));
		return new Response(JSON.stringify({ versions }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

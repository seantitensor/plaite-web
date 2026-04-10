import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getGeoDistribution } = await import('../../../../lib/firebase/analytics');
		const response = await getGeoDistribution(startDate, endDate);

		const countries = (response.rows || []).map((row) => ({
			country: row.dimensionValues?.[0]?.value || '',
			users: Number(row.metricValues?.[0]?.value || 0),
			sessions: Number(row.metricValues?.[1]?.value || 0),
		}));

		return new Response(JSON.stringify({ countries }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getFunnelData } = await import('../../../../lib/firebase/analytics');
		const { steps } = await getFunnelData(startDate, endDate);

		return new Response(JSON.stringify({ steps }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

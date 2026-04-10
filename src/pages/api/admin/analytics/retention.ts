import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
	const startDate = url.searchParams.get('startDate') || '30daysAgo';
	const endDate = url.searchParams.get('endDate') || 'today';

	try {
		const { getRetentionCohorts } = await import('../../../../lib/firebase/analytics');
		const response = await getRetentionCohorts(startDate, endDate);

		const cohorts: Record<string, Record<string, number>> = {};

		for (const row of response.rows || []) {
			const cohort = row.dimensionValues?.[0]?.value || '';
			const day = row.dimensionValues?.[1]?.value || '0';
			const users = Number(row.metricValues?.[0]?.value || 0);

			if (!cohorts[cohort]) cohorts[cohort] = {};
			cohorts[cohort][day] = users;
		}

		return new Response(JSON.stringify({ cohorts }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

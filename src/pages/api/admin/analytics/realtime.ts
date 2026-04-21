import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	try {
		const { getRealtimeActiveUsers } = await import('../../../../lib/firebase/analytics');
		const data = await getRealtimeActiveUsers();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

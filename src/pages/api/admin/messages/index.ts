import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { queryAllOrdered } from '../../../../lib/edge/firestore';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	try {
		const messages = await queryAllOrdered('contact_messages', 'createdAt', 'desc', env);
		return new Response(JSON.stringify({ messages }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

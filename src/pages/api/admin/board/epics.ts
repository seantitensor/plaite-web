import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { addDoc } from '../../../../lib/edge/firestore';
import { env } from "cloudflare:workers";

const BOARD_ID = 'default';

export const POST: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { request } = ctx;
	try {
		const body = await request.json();
		if (!body.name || typeof body.name !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing name' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const epic = {
			boardId: BOARD_ID,
			name: body.name.trim(),
			order: body.order ?? Date.now(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const doc = await addDoc('admin_epics', epic, env);

		return new Response(JSON.stringify(doc), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

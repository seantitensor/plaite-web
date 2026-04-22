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
		if (!body.epicId || !body.title) {
			return new Response(JSON.stringify({ error: 'Missing epicId or title' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const feature = {
			boardId: BOARD_ID,
			epicId: body.epicId,
			title: String(body.title).trim(),
			description: body.description || '',
			order: body.order ?? Date.now(),
			todos: [] as Array<{ id: string; text: string; done: boolean; order: number }>,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const doc = await addDoc('admin_features', feature, env);

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

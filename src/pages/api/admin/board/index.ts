import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { queryWhere } from '../../../../lib/edge/firestore';
import { env } from "cloudflare:workers";

const BOARD_ID = 'default';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	try {
		const [epics, features] = await Promise.all([
			queryWhere('admin_epics', 'boardId', '==', BOARD_ID, env),
			queryWhere('admin_features', 'boardId', '==', BOARD_ID, env),
		]);

		return new Response(JSON.stringify({ boardId: BOARD_ID, epics, features }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

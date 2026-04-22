import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { setAdminClaim } from '../../../../lib/edge/firebaseAdmin';

export const PATCH: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { params, request } = ctx;
	try {
		const { uid } = params;
		if (!uid) {
			return json({ error: 'Missing uid' }, 400);
		}

		const body = await request.json();
		if (typeof body.admin !== 'boolean') {
			return json({ error: 'Body must include admin: boolean' }, 400);
		}

		// Safety: don't let an admin revoke their own admin claim (would lock
		// themselves out immediately). Promoting self is a no-op but harmless.
		const selfUid = ctx.locals.user?.uid;
		if (selfUid === uid && body.admin === false) {
			return json({ error: "You can't revoke your own admin access" }, 400);
		}

		await setAdminClaim(uid, body.admin, env);
		return json({ success: true });
	} catch (error: any) {
		return json({ error: error.message }, 500);
	}
};

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

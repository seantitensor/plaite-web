import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { listUsers, isAdmin } from '../../../../lib/edge/firebaseAdmin';

export const GET: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	try {
		const users = await listUsers(env);
		const simplified = users.map((u) => ({
			uid: u.localId,
			email: u.email || '',
			displayName: u.displayName || '',
			createdAt: u.createdAt ? Number(u.createdAt) : null,
			lastLoginAt: u.lastLoginAt ? Number(u.lastLoginAt) : null,
			disabled: Boolean(u.disabled),
			emailVerified: Boolean(u.emailVerified),
			admin: isAdmin(u),
		}));
		return new Response(JSON.stringify({ users: simplified }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

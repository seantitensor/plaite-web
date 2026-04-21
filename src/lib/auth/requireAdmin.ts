import type { APIContext } from 'astro';
import { adminAuth } from '../firebase/admin';

export async function requireAdmin(ctx: APIContext): Promise<Response | null> {
	const session = ctx.cookies.get('__session')?.value;
	if (!session) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const decoded = await adminAuth.verifySessionCookie(session, true);
		if (!decoded.admin) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		ctx.locals.user = {
			uid: decoded.uid,
			email: decoded.email || '',
			name: decoded.name || decoded.email || '',
		};
		return null;
	} catch {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

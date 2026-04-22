import type { APIRoute } from 'astro';
import { getAuth } from '../../../../lib/auth/firebaseEdge';
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	try {
		const { idToken } = await request.json();

		if (!idToken) {
			return new Response(JSON.stringify({ error: 'Missing idToken' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const auth = getAuth(env);

		const decodedToken = await auth.verifyIdToken(idToken);

		if (!decodedToken.admin) {
			return new Response(JSON.stringify({ error: 'Not an admin user' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const expiresIn = 60 * 60 * 24 * 5 * 1000;
		const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

		cookies.set('__session', sessionCookie, {
			path: '/',
			httpOnly: true,
			secure: import.meta.env.PROD,
			sameSite: 'lax',
			maxAge: expiresIn / 1000,
		});

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message || 'Auth failed' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

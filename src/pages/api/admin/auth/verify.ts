import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const { idToken } = await request.json();

		if (!idToken) {
			return new Response(JSON.stringify({ error: 'Missing idToken' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { adminAuth } = await import('../../../../lib/firebase/admin');

		// Verify the ID token
		const decodedToken = await adminAuth.verifyIdToken(idToken);

		// Check admin custom claim
		if (!decodedToken.admin) {
			return new Response(JSON.stringify({ error: 'Not an admin user' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Create session cookie (5 days)
		const expiresIn = 60 * 60 * 24 * 5 * 1000;
		const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

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

import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getAuth } from './lib/auth/firebaseEdge';

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	if (!pathname.startsWith('/admin') || pathname === '/admin/login' || pathname === '/admin/login/') {
		return next();
	}

	if (pathname.startsWith('/api/')) {
		return next();
	}

	const sessionCookie = context.cookies.get('__session')?.value;
	if (!sessionCookie) {
		return context.redirect('/admin/login');
	}

	try {
		const auth = getAuth(env);
		const decodedToken = await auth.verifySessionCookie(sessionCookie, true);

		if (!decodedToken.admin) {
			return new Response('Forbidden: Admin access required', { status: 403 });
		}

		context.locals.user = {
			uid: decodedToken.uid,
			email: decodedToken.email || '',
			name: decodedToken.name || decodedToken.email || '',
		};

		return next();
	} catch {
		context.cookies.delete('__session');
		return context.redirect('/admin/login');
	}
});

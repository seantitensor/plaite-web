import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	// Only protect /admin routes (except login)
	if (!pathname.startsWith('/admin') || pathname === '/admin/login' || pathname === '/admin/login/') {
		return next();
	}

	// API routes handle their own auth
	if (pathname.startsWith('/api/')) {
		return next();
	}

	// Check for session cookie
	const sessionCookie = context.cookies.get('__session')?.value;
	if (!sessionCookie) {
		return context.redirect('/admin/login');
	}

	try {
		const { adminAuth } = await import('./lib/firebase/admin');
		const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

		// Check admin claim
		if (!decodedToken.admin) {
			return new Response('Forbidden: Admin access required', { status: 403 });
		}

		// Attach user info to locals for use in pages
		context.locals.user = {
			uid: decodedToken.uid,
			email: decodedToken.email || '',
			name: decodedToken.name || decodedToken.email || '',
		};

		return next();
	} catch {
		// Invalid or expired session
		context.cookies.delete('__session');
		return context.redirect('/admin/login');
	}
});

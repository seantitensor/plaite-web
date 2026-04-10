import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, redirect }) => {
	cookies.delete('__session', { path: '/' });
	return redirect('/admin/login');
};

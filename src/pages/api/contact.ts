import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addDoc } from '../../lib/edge/firestore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	// Honeypot — silently accept to not tip off spammers, but don't write.
	if (typeof body.company === 'string' && body.company.trim() !== '') {
		return json({ success: true });
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';
	const message = typeof body.message === 'string' ? body.message.trim() : '';

	if (name.length < 1 || name.length > 100) {
		return json({ error: 'Invalid name (1–100 characters)' }, 400);
	}
	if (email.length < 1 || email.length > 200 || !EMAIL_RE.test(email)) {
		return json({ error: 'Invalid email address' }, 400);
	}
	if (message.length < 1 || message.length > 2000) {
		return json({ error: 'Invalid message (1–2000 characters)' }, 400);
	}

	try {
		await addDoc(
			'contact_messages',
			{ name, email, message, responded: false, createdAt: new Date() },
			env,
		);
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to save message' }, 500);
	}
};

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

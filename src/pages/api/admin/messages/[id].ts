import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { updateDoc, deleteDoc } from '../../../../lib/edge/firestore';

export const PATCH: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { params, request } = ctx;
	try {
		const { id } = params;
		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing id' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const updateData: Record<string, any> = {};
		if (typeof body.responded === 'boolean') updateData.responded = body.responded;
		if (Object.keys(updateData).length === 0) {
			return new Response(JSON.stringify({ error: 'Nothing to update' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await updateDoc('contact_messages', id, updateData, env);

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const DELETE: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { params } = ctx;
	try {
		const { id } = params;
		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing id' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await deleteDoc('contact_messages', id, env);

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

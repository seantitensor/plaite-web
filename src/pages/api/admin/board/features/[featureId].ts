import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';
import { updateDoc, deleteDoc } from '../../../../../lib/edge/firestore';
import { env } from "cloudflare:workers";

export const PUT: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { params, request } = ctx;
	try {
		const { featureId } = params;
		if (!featureId) {
			return new Response(JSON.stringify({ error: 'Missing featureId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();

		const updateData: Record<string, any> = { updatedAt: new Date() };
		const allowedFields = ['title', 'description', 'epicId', 'order', 'todos'];
		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field];
			}
		}

		await updateDoc('admin_features', featureId, updateData, env);

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
		const { featureId } = params;
		if (!featureId) {
			return new Response(JSON.stringify({ error: 'Missing featureId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await deleteDoc('admin_features', featureId, env);

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

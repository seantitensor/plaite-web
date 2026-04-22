import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/auth/requireAdmin';
import {
	updateDoc,
	queryWhere,
	commitBatch,
	buildDocName,
	type FirestoreWrite,
} from '../../../../../lib/edge/firestore';
import { env } from 'cloudflare:workers';

export const PUT: APIRoute = async (ctx) => {
	const denied = await requireAdmin(ctx);
	if (denied) return denied;

	const { params, request } = ctx;
	try {
		const { epicId } = params;
		if (!epicId) {
			return new Response(JSON.stringify({ error: 'Missing epicId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();

		const updateData: Record<string, any> = { updatedAt: new Date() };
		if (body.name !== undefined) updateData.name = String(body.name).trim();
		if (body.order !== undefined) updateData.order = body.order;

		await updateDoc('admin_epics', epicId, updateData, env);

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
		const { epicId } = params;
		if (!epicId) {
			return new Response(JSON.stringify({ error: 'Missing epicId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}


		const features = await queryWhere('admin_features', 'epicId', '==', epicId, env);

		const writes: FirestoreWrite[] = [];
		for (const f of features) {
			writes.push({ delete: await buildDocName('admin_features', f.id, env) });
		}
		writes.push({ delete: await buildDocName('admin_epics', epicId, env) });

		await commitBatch(writes, env);

		return new Response(JSON.stringify({ success: true, deletedFeatures: features.length }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

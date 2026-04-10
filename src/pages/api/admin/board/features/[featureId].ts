import type { APIRoute } from 'astro';

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const { featureId } = params;
		if (!featureId) {
			return new Response(JSON.stringify({ error: 'Missing featureId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const { adminDb } = await import('../../../../../lib/firebase/admin');

		const updateData: Record<string, any> = { updatedAt: new Date() };
		const allowedFields = ['title', 'description', 'epicId', 'order', 'todos'];
		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field];
			}
		}

		await adminDb.collection('admin_features').doc(featureId).update(updateData);

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

export const DELETE: APIRoute = async ({ params }) => {
	try {
		const { featureId } = params;
		if (!featureId) {
			return new Response(JSON.stringify({ error: 'Missing featureId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { adminDb } = await import('../../../../../lib/firebase/admin');
		await adminDb.collection('admin_features').doc(featureId).delete();

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

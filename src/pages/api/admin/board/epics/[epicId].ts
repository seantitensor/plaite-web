import type { APIRoute } from 'astro';

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const { epicId } = params;
		if (!epicId) {
			return new Response(JSON.stringify({ error: 'Missing epicId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const { adminDb } = await import('../../../../../lib/firebase/admin');

		const updateData: Record<string, any> = { updatedAt: new Date() };
		if (body.name !== undefined) updateData.name = String(body.name).trim();
		if (body.order !== undefined) updateData.order = body.order;

		await adminDb.collection('admin_epics').doc(epicId).update(updateData);

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
		const { epicId } = params;
		if (!epicId) {
			return new Response(JSON.stringify({ error: 'Missing epicId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { adminDb } = await import('../../../../../lib/firebase/admin');

		// Cascade: delete all features under this epic, then the epic itself
		const featuresSnap = await adminDb
			.collection('admin_features')
			.where('epicId', '==', epicId)
			.get();

		const batch = adminDb.batch();
		featuresSnap.docs.forEach((doc) => batch.delete(doc.ref));
		batch.delete(adminDb.collection('admin_epics').doc(epicId));
		await batch.commit();

		return new Response(JSON.stringify({ success: true, deletedFeatures: featuresSnap.size }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

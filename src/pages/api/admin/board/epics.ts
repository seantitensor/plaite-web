import type { APIRoute } from 'astro';

const BOARD_ID = 'default';

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		if (!body.name || typeof body.name !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing name' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { adminDb } = await import('../../../../lib/firebase/admin');

		const epic = {
			boardId: BOARD_ID,
			name: body.name.trim(),
			order: body.order ?? Date.now(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const docRef = await adminDb.collection('admin_epics').add(epic);

		return new Response(JSON.stringify({ id: docRef.id, ...epic }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

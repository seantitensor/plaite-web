import type { APIRoute } from 'astro';

const BOARD_ID = 'default';

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		if (!body.epicId || !body.title) {
			return new Response(JSON.stringify({ error: 'Missing epicId or title' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { adminDb } = await import('../../../../lib/firebase/admin');

		const feature = {
			boardId: BOARD_ID,
			epicId: body.epicId,
			title: String(body.title).trim(),
			description: body.description || '',
			order: body.order ?? Date.now(),
			todos: [] as Array<{ id: string; text: string; done: boolean; order: number }>,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const docRef = await adminDb.collection('admin_features').add(feature);

		return new Response(JSON.stringify({ id: docRef.id, ...feature }), {
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

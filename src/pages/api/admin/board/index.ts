import type { APIRoute } from 'astro';

const BOARD_ID = 'default';

export const GET: APIRoute = async () => {
	try {
		const { adminDb } = await import('../../../../lib/firebase/admin');

		// No orderBy here — combining where() + orderBy() on different fields
		// requires a composite index. Client-side sorting handles it.
		const [epicsSnap, featuresSnap] = await Promise.all([
			adminDb.collection('admin_epics').where('boardId', '==', BOARD_ID).get(),
			adminDb.collection('admin_features').where('boardId', '==', BOARD_ID).get(),
		]);

		const epics = epicsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		const features = featuresSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		return new Response(JSON.stringify({ boardId: BOARD_ID, epics, features }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

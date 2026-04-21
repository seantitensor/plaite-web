import { readFileSync } from 'node:fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
	if (getApps().length) return getApps()[0];

	const path = import.meta.env.GOOGLE_APPLICATION_CREDENTIALS;
	if (!path) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set');

	const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
	return initializeApp({ credential: cert(serviceAccount) });
}

const app = getAdminApp();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

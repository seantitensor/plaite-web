import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
	if (getApps().length) return getApps()[0];

	// Uses GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
	return initializeApp({ credential: applicationDefault() });
}

const app = getAdminApp();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

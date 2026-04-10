// One-time script to grant admin role to a Firebase Auth user.
// Usage: node scripts/set-admin.mjs <email>
// Requires GOOGLE_APPLICATION_CREDENTIALS env var set.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
if (!email) {
	console.error('Usage: node scripts/set-admin.mjs <email>');
	process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();

try {
	const user = await auth.getUserByEmail(email);
	await auth.setCustomUserClaims(user.uid, { admin: true });
	console.log(`✓ Admin role granted to ${email} (uid: ${user.uid})`);
	console.log('User must sign out and sign back in for changes to take effect.');
} catch (error) {
	console.error('Error:', error.message);
	process.exit(1);
}

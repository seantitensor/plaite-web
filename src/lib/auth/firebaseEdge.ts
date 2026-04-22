import {
	Auth,
	WorkersKVStoreSingle,
	ServiceAccountCredential,
} from 'firebase-auth-cloudflare-workers';

export function getAuth(env: Env): Auth {
	// ID tokens and session cookies are signed by DIFFERENT Google public keys,
	// fetched from different cert URLs. The library's BaseAuth wires both
	// verifiers to one shared keyStore, so each fetch overwrites the other's
	// cache and we get "kid does not correspond to a known public key" errors.
	// Give them separate KV slots.
	const idTokenStore = WorkersKVStoreSingle.getOrInitialize('jwks-idtoken', env.JWKS_CACHE);
	const sessionStore = WorkersKVStoreSingle.getOrInitialize('jwks-session', env.JWKS_CACHE);

	// ServiceAccountCredential expects the raw JSON string — it parses
	// internally. Always wire credentials in (even for verify-only paths) so
	// the Auth.getOrInitialize singleton can createSessionCookie later.
	const auth = Auth.getOrInitialize(
		env.PUBLIC_FIREBASE_PROJECT_ID,
		idTokenStore,
		new ServiceAccountCredential(env.GOOGLE_CREDENTIALS_JSON),
	);

	// Override the session-cookie verifier's keyStore so it no longer shares
	// the slot with the ID-token verifier. Safe to call on every request:
	// reassigning to the same value is a no-op.
	(auth as any).sessionCookieVerifier.signatureVerifier.keyFetcher.keyStorer = sessionStore;

	return auth;
}

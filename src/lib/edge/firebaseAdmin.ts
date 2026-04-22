import { getAccessToken, parseServiceAccount, type ServiceAccount } from './googleAuth';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export interface FirebaseUser {
	localId: string;
	email?: string;
	displayName?: string;
	photoUrl?: string;
	createdAt?: string;   // epoch millis string
	lastLoginAt?: string; // epoch millis string
	customAttributes?: string;
	disabled?: boolean;
	emailVerified?: boolean;
}

function projectId(sa: ServiceAccount): string {
	const pid = (sa as any).project_id;
	if (!pid) throw new Error('service account missing project_id');
	return pid;
}

async function getAuthHeaders(env: Env): Promise<{ headers: Record<string, string>; sa: ServiceAccount }> {
	const sa = parseServiceAccount(env.GOOGLE_CREDENTIALS_JSON);
	const token = await getAccessToken(sa, SCOPE);
	return {
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		sa,
	};
}

/**
 * List all Firebase Auth users in the project. Uses Identity Toolkit's
 * batchGet endpoint. Paginates internally up to `max` users.
 */
export async function listUsers(env: Env, max = 1000): Promise<FirebaseUser[]> {
	const { headers, sa } = await getAuthHeaders(env);
	const base = `https://identitytoolkit.googleapis.com/v1/projects/${projectId(sa)}/accounts:batchGet`;

	const collected: FirebaseUser[] = [];
	let pageToken: string | undefined;

	while (collected.length < max) {
		const remaining = Math.min(1000, max - collected.length);
		const params = new URLSearchParams({ maxResults: String(remaining) });
		if (pageToken) params.set('nextPageToken', pageToken);

		const res = await fetch(`${base}?${params}`, { method: 'GET', headers });
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Firebase listUsers failed (${res.status}): ${text}`);
		}
		const body = (await res.json()) as { users?: FirebaseUser[]; nextPageToken?: string };
		if (body.users) collected.push(...body.users);
		if (!body.nextPageToken || !body.users?.length) break;
		pageToken = body.nextPageToken;
	}

	return collected;
}

/** Parse the customAttributes JSON string and return whether admin is true. */
export function isAdmin(user: FirebaseUser): boolean {
	if (!user.customAttributes) return false;
	try {
		const parsed = JSON.parse(user.customAttributes);
		return Boolean(parsed && typeof parsed === 'object' && parsed.admin === true);
	} catch {
		return false;
	}
}

/**
 * Set or unset the admin custom claim on a user. We always write a full
 * customAttributes object so other claims aren't silently preserved — we
 * only care about `admin` here.
 */
export async function setAdminClaim(uid: string, makeAdmin: boolean, env: Env): Promise<void> {
	const { headers, sa } = await getAuthHeaders(env);
	const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId(sa)}/accounts:update`;
	const customAttributes = makeAdmin ? JSON.stringify({ admin: true }) : JSON.stringify({});
	const res = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify({ localId: uid, customAttributes }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firebase setCustomClaims failed (${res.status}): ${text}`);
	}
}

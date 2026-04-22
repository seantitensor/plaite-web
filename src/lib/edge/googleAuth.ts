export interface ServiceAccount {
	client_email: string;
	private_key: string;
	private_key_id?: string;
}

interface TokenCacheEntry {
	token: string;
	expiresAt: number; // epoch ms
}

// Isolate-local cache. 1h TTL matches Google's access-token lifetime.
const cache = new Map<string, TokenCacheEntry>();

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let str = '';
	for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
	const b64 = pem
		.replace(/-----BEGIN [^-]+-----/g, '')
		.replace(/-----END [^-]+-----/g, '')
		.replace(/\s+/g, '');
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}

async function signJwt(sa: ServiceAccount, scope: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
	const claims = {
		iss: sa.client_email,
		scope,
		aud: 'https://oauth2.googleapis.com/token',
		exp: now + 3600,
		iat: now,
	};
	const encoder = new TextEncoder();
	const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
	const encodedClaims = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
	const message = `${encodedHeader}.${encodedClaims}`;

	const key = await crypto.subtle.importKey(
		'pkcs8',
		pemToArrayBuffer(sa.private_key),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(message));
	return `${message}.${base64UrlEncode(signature)}`;
}

export async function getAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
	const cacheKey = `${sa.client_email}|${scope}`;
	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

	const jwt = await signJwt(sa, scope);
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwt,
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token exchange failed (${res.status}): ${text}`);
	}
	const body = (await res.json()) as { access_token: string; expires_in: number };
	cache.set(cacheKey, {
		token: body.access_token,
		expiresAt: Date.now() + body.expires_in * 1000,
	});
	return body.access_token;
}

export function parseServiceAccount(json: string): ServiceAccount {
	const sa = JSON.parse(json) as ServiceAccount;
	if (!sa.client_email || !sa.private_key) {
		throw new Error('GOOGLE_CREDENTIALS_JSON missing client_email or private_key');
	}
	return sa;
}

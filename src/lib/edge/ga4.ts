import { getAccessToken, parseServiceAccount } from './googleAuth';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

async function call(endpoint: string, body: Record<string, any>, env: Env): Promise<any> {
	const sa = parseServiceAccount(env.GOOGLE_CREDENTIALS_JSON);
	const token = await getAccessToken(sa, GA_SCOPE);
	const url = `https://analyticsdata.googleapis.com/v1beta/properties/${env.GA_PROPERTY_ID}:${endpoint}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GA4 ${endpoint} failed (${res.status}): ${text}`);
	}
	return res.json();
}

export function runReport(body: Record<string, any>, env: Env): Promise<any> {
	return call('runReport', body, env);
}

export function runRealtimeReport(body: Record<string, any>, env: Env): Promise<any> {
	return call('runRealtimeReport', body, env);
}

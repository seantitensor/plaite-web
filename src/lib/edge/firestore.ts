import { getAccessToken, parseServiceAccount, type ServiceAccount } from './googleAuth';

const SCOPE = 'https://www.googleapis.com/auth/datastore';

type FsValue =
	| { stringValue: string }
	| { integerValue: string }
	| { doubleValue: number }
	| { booleanValue: boolean }
	| { nullValue: null }
	| { timestampValue: string }
	| { arrayValue: { values?: FsValue[] } }
	| { mapValue: { fields?: Record<string, FsValue> } };

export type FirestoreWrite =
	| { delete: string }
	| {
		update: {
			name: string;
			fields: Record<string, FsValue>;
		};
		updateMask?: { fieldPaths: string[] };
	};

function toFsValue(v: unknown): FsValue {
	if (v === null) return { nullValue: null };
	if (v instanceof Date) return { timestampValue: v.toISOString() };
	if (typeof v === 'string') return { stringValue: v };
	if (typeof v === 'boolean') return { booleanValue: v };
	if (typeof v === 'number') {
		if (Number.isInteger(v)) return { integerValue: String(v) };
		return { doubleValue: v };
	}
	if (Array.isArray(v)) {
		return { arrayValue: { values: v.map(toFsValue) } };
	}
	if (typeof v === 'object') {
		const fields: Record<string, FsValue> = {};
		for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
			fields[k] = toFsValue(val);
		}
		return { mapValue: { fields } };
	}
	throw new Error(`Unsupported Firestore value type: ${typeof v}`);
}

function fromFsValue(v: FsValue): unknown {
	if ('stringValue' in v) return v.stringValue;
	if ('integerValue' in v) return Number(v.integerValue);
	if ('doubleValue' in v) return v.doubleValue;
	if ('booleanValue' in v) return v.booleanValue;
	if ('nullValue' in v) return null;
	if ('timestampValue' in v) return new Date(v.timestampValue);
	if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
	if ('mapValue' in v) {
		const out: Record<string, unknown> = {};
		for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
			out[k] = fromFsValue(val);
		}
		return out;
	}
	return null;
}

function docIdFromName(name: string): string {
	const parts = name.split('/');
	return parts[parts.length - 1];
}

function fieldsToObject(fields: Record<string, FsValue>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(fields)) out[k] = fromFsValue(v);
	return out;
}

function objectToFields(obj: Record<string, unknown>): Record<string, FsValue> {
	const fields: Record<string, FsValue> = {};
	for (const [k, v] of Object.entries(obj)) fields[k] = toFsValue(v);
	return fields;
}

async function authHeader(env: Env): Promise<{ Authorization: string; sa: ServiceAccount }> {
	const sa = parseServiceAccount(env.GOOGLE_CREDENTIALS_JSON);
	const token = await getAccessToken(sa, SCOPE);
	return { Authorization: `Bearer ${token}`, sa };
}

function baseUrl(sa: ServiceAccount): string {
	return `https://firestore.googleapis.com/v1/projects/${sa.project_id || (sa as any).projectId}/databases/(default)/documents`;
}

// Fall-through: service account JSON has `project_id` at the top level.
function projectId(sa: ServiceAccount): string {
	const pid = (sa as any).project_id;
	if (!pid) throw new Error('service account missing project_id');
	return pid;
}

function docsBase(sa: ServiceAccount): string {
	return `https://firestore.googleapis.com/v1/projects/${projectId(sa)}/databases/(default)/documents`;
}

export async function queryWhere(
	col: string,
	field: string,
	op: '==' | '<' | '<=' | '>' | '>=' | '!=',
	value: unknown,
	env: Env,
): Promise<Array<{ id: string } & Record<string, unknown>>> {
	const { Authorization, sa } = await authHeader(env);
	const opMap: Record<string, string> = {
		'==': 'EQUAL',
		'<': 'LESS_THAN',
		'<=': 'LESS_THAN_OR_EQUAL',
		'>': 'GREATER_THAN',
		'>=': 'GREATER_THAN_OR_EQUAL',
		'!=': 'NOT_EQUAL',
	};
	const body = {
		structuredQuery: {
			from: [{ collectionId: col }],
			where: {
				fieldFilter: {
					field: { fieldPath: field },
					op: opMap[op],
					value: toFsValue(value),
				},
			},
		},
	};
	const res = await fetch(`${docsBase(sa)}:runQuery`, {
		method: 'POST',
		headers: { Authorization, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firestore runQuery failed (${res.status}): ${text}`);
	}
	const rows = (await res.json()) as Array<{
		document?: { name: string; fields?: Record<string, FsValue> };
	}>;
	return rows
		.filter((r) => r.document)
		.map((r) => ({
			id: docIdFromName(r.document!.name),
			...fieldsToObject(r.document!.fields || {}),
		}));
}

export async function queryAllOrdered(
	col: string,
	field: string,
	direction: 'asc' | 'desc',
	env: Env,
	limit = 100,
): Promise<Array<{ id: string } & Record<string, unknown>>> {
	const { Authorization, sa } = await authHeader(env);
	const body = {
		structuredQuery: {
			from: [{ collectionId: col }],
			orderBy: [
				{
					field: { fieldPath: field },
					direction: direction === 'desc' ? 'DESCENDING' : 'ASCENDING',
				},
			],
			limit,
		},
	};
	const res = await fetch(`${docsBase(sa)}:runQuery`, {
		method: 'POST',
		headers: { Authorization, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firestore runQuery failed (${res.status}): ${text}`);
	}
	const rows = (await res.json()) as Array<{
		document?: { name: string; fields?: Record<string, FsValue> };
	}>;
	return rows
		.filter((r) => r.document)
		.map((r) => ({
			id: docIdFromName(r.document!.name),
			...fieldsToObject(r.document!.fields || {}),
		}));
}

export async function addDoc(
	col: string,
	data: Record<string, unknown>,
	env: Env,
): Promise<{ id: string } & Record<string, unknown>> {
	const { Authorization, sa } = await authHeader(env);
	const res = await fetch(`${docsBase(sa)}/${encodeURIComponent(col)}`, {
		method: 'POST',
		headers: { Authorization, 'Content-Type': 'application/json' },
		body: JSON.stringify({ fields: objectToFields(data) }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firestore add failed (${res.status}): ${text}`);
	}
	const doc = (await res.json()) as { name: string };
	return { id: docIdFromName(doc.name), ...data };
}

export async function updateDoc(
	col: string,
	id: string,
	data: Record<string, unknown>,
	env: Env,
): Promise<void> {
	const { Authorization, sa } = await authHeader(env);
	// updateMask makes this a PARTIAL update. Without it, Firestore REST
	// overwrites the whole document and nukes unspecified fields.
	const mask = Object.keys(data)
		.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
		.join('&');
	const url =
		`${docsBase(sa)}/${encodeURIComponent(col)}/${encodeURIComponent(id)}` +
		(mask ? `?${mask}` : '');
	const res = await fetch(url, {
		method: 'PATCH',
		headers: { Authorization, 'Content-Type': 'application/json' },
		body: JSON.stringify({ fields: objectToFields(data) }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firestore update failed (${res.status}): ${text}`);
	}
}

export async function deleteDoc(col: string, id: string, env: Env): Promise<void> {
	const { Authorization, sa } = await authHeader(env);
	const url = `${docsBase(sa)}/${encodeURIComponent(col)}/${encodeURIComponent(id)}`;
	const res = await fetch(url, {
		method: 'DELETE',
		headers: { Authorization },
	});
	if (!res.ok && res.status !== 404) {
		const text = await res.text();
		throw new Error(`Firestore delete failed (${res.status}): ${text}`);
	}
}

export function docPath(sa: ServiceAccount, col: string, id: string): string {
	return `projects/${projectId(sa)}/databases/(default)/documents/${col}/${id}`;
}

export async function commitBatch(writes: FirestoreWrite[], env: Env): Promise<void> {
	const { Authorization, sa } = await authHeader(env);
	const res = await fetch(`${docsBase(sa)}:commit`, {
		method: 'POST',
		headers: { Authorization, 'Content-Type': 'application/json' },
		body: JSON.stringify({ writes }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firestore commit failed (${res.status}): ${text}`);
	}
}

// Helper used by cascade-delete callers to build the `delete` doc name.
export async function buildDocName(col: string, id: string, env: Env): Promise<string> {
	const sa = parseServiceAccount(env.GOOGLE_CREDENTIALS_JSON);
	return docPath(sa, col, id);
}

import { useEffect, useMemo, useState } from 'react';
import { relativeTime } from '../../../lib/relativeTime';

interface User {
	uid: string;
	email: string;
	displayName: string;
	createdAt: number | null;
	lastLoginAt: number | null;
	disabled: boolean;
	emailVerified: boolean;
	admin: boolean;
}

export default function UsersList() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [busy, setBusy] = useState<Record<string, boolean>>({});
	const [selfUid, setSelfUid] = useState<string>('');

	useEffect(() => {
		load();
	}, []);

	async function load() {
		setLoading(true);
		setError('');
		try {
			const res = await fetch('/api/admin/users');
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || 'Failed to load users');
			const list = (body.users as User[]).slice().sort((a, b) => {
				if (a.admin !== b.admin) return a.admin ? -1 : 1;
				return a.email.localeCompare(b.email);
			});
			setUsers(list);
			const meta = document.querySelector('meta[name="admin-uid"]') as HTMLMetaElement | null;
			if (meta?.content) setSelfUid(meta.content);
		} catch (err: any) {
			setError(err.message || 'Failed to load');
		} finally {
			setLoading(false);
		}
	}

	async function toggleAdmin(user: User) {
		const next = !user.admin;
		if (!next && !confirm(`Revoke admin access for ${user.email}?`)) return;

		setBusy((b) => ({ ...b, [user.uid]: true }));
		setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, admin: next } : u)));

		try {
			const res = await fetch(`/api/admin/users/${user.uid}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ admin: next }),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || 'Failed to update admin claim');
		} catch (err: any) {
			setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, admin: !next } : u)));
			alert(err.message || 'Failed to update admin claim');
		} finally {
			setBusy((b) => {
				const copy = { ...b };
				delete copy[user.uid];
				return copy;
			});
		}
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) =>
				u.email.toLowerCase().includes(q) ||
				u.displayName.toLowerCase().includes(q) ||
				u.uid.toLowerCase().includes(q),
		);
	}, [users, query]);

	const adminCount = users.filter((u) => u.admin).length;

	return (
		<div>
			<div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by email, name, or UID…"
					className="flex-1 min-w-[240px] max-w-md px-3 py-2 bg-surface border border-hairline rounded-md text-[14px] text-ink outline-none focus:border-accent font-sans"
				/>
				<span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70">
					{users.length} total · {adminCount} admin{adminCount === 1 ? '' : 's'}
				</span>
			</div>

			{error && (
				<div className="bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-4 py-3 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-hairline rounded-lg">
					Loading users…
				</div>
			) : filtered.length === 0 ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-dashed border-hairline rounded-lg">
					{query ? 'No users match that search.' : 'No Firebase Auth users yet.'}
				</div>
			) : (
				<div className="bg-surface border border-hairline rounded-lg overflow-hidden">
					<table className="w-full border-collapse text-[13.5px]">
						<thead>
							<tr className="bg-canvas">
								<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 px-4 py-3 border-b border-hairline">User</th>
								<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 px-4 py-3 border-b border-hairline">Last sign-in</th>
								<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 px-4 py-3 border-b border-hairline">Created</th>
								<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 px-4 py-3 border-b border-hairline">Access</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((u) => {
								const isSelf = selfUid && u.uid === selfUid;
								const isBusy = busy[u.uid];
								return (
									<tr key={u.uid} className="border-b border-hairline/60 last:border-b-0">
										<td className="px-4 py-3 align-top">
											<div className="flex flex-col min-w-0">
												<span className="text-ink font-medium truncate">{u.email}</span>
												{u.displayName && (
													<span className="text-muted text-[12px] truncate">{u.displayName}</span>
												)}
												<span className="font-mono text-[11px] text-muted/80 truncate mt-0.5">{u.uid}</span>
											</div>
										</td>
										<td className="px-4 py-3 font-mono text-[12px] text-muted align-top whitespace-nowrap">
											{u.lastLoginAt ? relativeTime(new Date(u.lastLoginAt).toISOString()) : '—'}
										</td>
										<td className="px-4 py-3 font-mono text-[12px] text-muted align-top whitespace-nowrap">
											{u.createdAt ? relativeTime(new Date(u.createdAt).toISOString()) : '—'}
										</td>
										<td className="px-4 py-3 text-right align-top">
											{u.admin ? (
												<div className="inline-flex items-center gap-2">
													<span className="font-semibold text-[10px] uppercase tracking-[0.12em] bg-mint text-forest border border-forest/30 rounded px-2 py-0.5">
														Admin
													</span>
													{isSelf ? (
														<span className="font-mono text-[11px] text-muted">(you)</span>
													) : (
														<button
															type="button"
															disabled={isBusy}
															onClick={() => toggleAdmin(u)}
															className="px-3 py-1 rounded-md text-[12px] text-alarm hover:bg-alarm-wash transition-colors disabled:opacity-60"
														>
															Revoke
														</button>
													)}
												</div>
											) : (
												<button
													type="button"
													disabled={isBusy}
													onClick={() => toggleAdmin(u)}
													className="px-3.5 py-1.5 rounded-md bg-accent text-surface text-[12.5px] font-medium hover:bg-ink transition-colors disabled:opacity-60"
												>
													{isBusy ? '…' : 'Grant admin'}
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

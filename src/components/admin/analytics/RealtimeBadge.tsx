import { useEffect, useState } from 'react';

export default function RealtimeBadge() {
	const [users, setUsers] = useState<number | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		async function fetchOnce() {
			try {
				const res = await fetch('/api/admin/analytics/realtime');
				if (!res.ok) throw new Error('bad status');
				const body = await res.json();
				if (!cancelled) {
					setUsers(body.users ?? 0);
					setError(false);
				}
			} catch {
				if (!cancelled) setError(true);
			}
		}
		fetchOnce();
		const id = setInterval(fetchOnce, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	return (
		<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-hairline">
			<span className="relative flex h-2 w-2">
				<span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-live"></span>
				<span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
			</span>
			<span className="text-[12px] font-medium text-ink whitespace-nowrap">
				{error ? '—' : users === null ? '…' : users.toLocaleString()}
				<span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 ml-1.5">live</span>
			</span>
		</div>
	);
}

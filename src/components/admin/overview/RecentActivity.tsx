import { useEffect, useState } from 'react';
import { relativeTime } from '../../../lib/relativeTime';

type FeedKind = 'message' | 'feature' | 'epic';

interface FeedItem {
	id: string;
	kind: FeedKind;
	timestamp: string;
	label: string;
	sublabel?: string;
	href: string;
}

interface Message { id: string; name: string; message: string; createdAt: string }
interface Epic { id: string; name: string; updatedAt?: string; createdAt?: string }
interface Feature { id: string; title: string; updatedAt?: string; createdAt?: string }

function pickDate(e: { updatedAt?: string; createdAt?: string }): string {
	return e.updatedAt || e.createdAt || '';
}

export default function RecentActivity() {
	const [items, setItems] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [msgRes, boardRes] = await Promise.allSettled([
					fetch('/api/admin/messages').then((r) => r.json()),
					fetch('/api/admin/board').then((r) => r.json()),
				]);
				if (cancelled) return;

				const feed: FeedItem[] = [];
				if (msgRes.status === 'fulfilled' && !msgRes.value.error) {
					for (const m of (msgRes.value.messages || []) as Message[]) {
						if (!m.createdAt) continue;
						feed.push({
							id: `msg-${m.id}`,
							kind: 'message',
							timestamp: m.createdAt,
							label: `New message from ${m.name}`,
							sublabel: m.message.slice(0, 80) + (m.message.length > 80 ? '…' : ''),
							href: '/admin/messages',
						});
					}
				}
				if (boardRes.status === 'fulfilled' && !boardRes.value.error) {
					for (const f of (boardRes.value.features || []) as Feature[]) {
						const ts = pickDate(f);
						if (!ts) continue;
						feed.push({
							id: `feat-${f.id}`,
							kind: 'feature',
							timestamp: ts,
							label: `Feature "${f.title}" updated`,
							href: '/admin/board',
						});
					}
					for (const e of (boardRes.value.epics || []) as Epic[]) {
						const ts = pickDate(e);
						if (!ts) continue;
						feed.push({
							id: `epic-${e.id}`,
							kind: 'epic',
							timestamp: ts,
							label: `Epic "${e.name}" updated`,
							href: '/admin/board',
						});
					}
				}
				feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
				setItems(feed.slice(0, 10));
			} catch (err: any) {
				if (!cancelled) setError(err.message || 'Failed to load');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, []);

	return (
		<section className="mt-14">
			<h2 className="italic text-[24px] font-normal tracking-[-0.02em] text-ink mb-4">Recent activity</h2>

			{error && (
				<div className="bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-4 py-3">
					{error}
				</div>
			)}

			{loading ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-hairline rounded-lg">
					Loading activity…
				</div>
			) : items.length === 0 ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-dashed border-hairline rounded-lg">
					No recent activity yet.
				</div>
			) : (
				<ul className="bg-surface border border-hairline rounded-lg list-none p-0 m-0 overflow-hidden">
					{items.map((it, i) => (
						<li key={it.id} className={i !== items.length - 1 ? 'border-b border-hairline' : ''}>
							<a href={it.href} className="flex items-center gap-3 px-5 py-3.5 no-underline text-ink hover:bg-mint-wash transition-colors">
								<span className="w-6 h-6 rounded flex items-center justify-center bg-accent-wash text-accent flex-shrink-0">
									<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
										{iconPath(it.kind)}
									</svg>
								</span>
								<span className="flex-1 min-w-0">
									<span className="block text-[13.5px] text-ink truncate">{it.label}</span>
									{it.sublabel && <span className="block text-[12px] text-muted truncate mt-0.5">{it.sublabel}</span>}
								</span>
								<span className="font-mono text-[11px] text-muted whitespace-nowrap">{relativeTime(it.timestamp)}</span>
							</a>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function iconPath(kind: FeedKind) {
	if (kind === 'message') {
		return (
			<>
				<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
				<polyline points="22,6 12,13 2,6" />
			</>
		);
	}
	if (kind === 'feature') {
		return (
			<>
				<polyline points="9 11 12 14 22 4" />
				<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
			</>
		);
	}
	return (
		<>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M9 3v18" />
			<path d="M15 3v18" />
		</>
	);
}

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

interface Message {
	id: string;
	name: string;
	message: string;
	createdAt: string;
}
interface Epic {
	id: string;
	name: string;
	updatedAt?: string;
	createdAt?: string;
}
interface Feature {
	id: string;
	title: string;
	updatedAt?: string;
	createdAt?: string;
}

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
							sublabel:
								m.message.slice(0, 80) + (m.message.length > 80 ? '…' : ''),
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

				feed.sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
				);
				setItems(feed.slice(0, 10));
			} catch (err: any) {
				if (!cancelled) setError(err.message || 'Failed to load');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div style={styles.section}>
			<h2 style={styles.title}>Recent activity</h2>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.empty}>Loading activity…</div>
			) : items.length === 0 ? (
				<div style={styles.empty}>No recent activity yet.</div>
			) : (
				<ul style={styles.list}>
					{items.map((it) => (
						<li key={it.id} style={styles.item}>
							<a href={it.href} style={styles.row}>
								<span style={styles.iconWrap}>{iconFor(it.kind)}</span>
								<span style={styles.body}>
									<span style={styles.label}>{it.label}</span>
									{it.sublabel && <span style={styles.sublabel}>{it.sublabel}</span>}
								</span>
								<span style={styles.time}>{relativeTime(it.timestamp)}</span>
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function iconFor(kind: FeedKind) {
	const common = {
		width: 16,
		height: 16,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 2,
	};
	if (kind === 'message') {
		return (
			<svg {...common}>
				<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
				<polyline points="22,6 12,13 2,6" />
			</svg>
		);
	}
	if (kind === 'feature') {
		return (
			<svg {...common}>
				<polyline points="9 11 12 14 22 4" />
				<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
			</svg>
		);
	}
	return (
		<svg {...common}>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M9 3v18" />
			<path d="M15 3v18" />
		</svg>
	);
}

const styles: Record<string, React.CSSProperties> = {
	section: {
		marginTop: '2.5rem',
	},
	title: {
		fontSize: '1rem',
		fontWeight: 700,
		color: '#1e293b',
		marginBottom: '0.75rem',
	},
	error: {
		background: '#fef2f2',
		color: '#dc2626',
		padding: '0.75rem 1rem',
		borderRadius: '8px',
		fontSize: '0.85rem',
	},
	empty: {
		background: '#f8fafc',
		border: '1px dashed #e2e8f0',
		borderRadius: '12px',
		padding: '1.25rem 1rem',
		color: '#94a3b8',
		fontSize: '0.9rem',
		textAlign: 'center',
	},
	list: {
		listStyle: 'none',
		padding: 0,
		margin: 0,
		background: '#fff',
		border: '1px solid #e2e8f0',
		borderRadius: '12px',
		overflow: 'hidden',
	},
	item: {
		borderBottom: '1px solid #f1f5f9',
	},
	row: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '0.75rem 1rem',
		textDecoration: 'none',
		color: 'inherit',
	},
	iconWrap: {
		color: '#4A9B6B',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: '24px',
		height: '24px',
		background: 'rgba(74, 155, 107, 0.1)',
		borderRadius: '6px',
		flexShrink: 0,
	},
	body: {
		display: 'flex',
		flexDirection: 'column',
		minWidth: 0,
		flex: 1,
	},
	label: {
		fontSize: '0.88rem',
		color: '#1e293b',
		fontWeight: 500,
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	},
	sublabel: {
		fontSize: '0.78rem',
		color: '#94a3b8',
		marginTop: '0.15rem',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	},
	time: {
		fontSize: '0.72rem',
		color: '#94a3b8',
		whiteSpace: 'nowrap',
		marginLeft: '0.5rem',
	},
};

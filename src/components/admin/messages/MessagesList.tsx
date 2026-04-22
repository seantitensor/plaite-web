import { useEffect, useState } from 'react';
import { relativeTime } from '../../../lib/relativeTime';

interface Message {
	id: string;
	name: string;
	email: string;
	message: string;
	responded: boolean;
	createdAt: string;
}

interface Epic {
	id: string;
	name: string;
	order?: number;
}

export default function MessagesList() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [epics, setEpics] = useState<Epic[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [expanded, setExpanded] = useState<string | null>(null);
	const [pickerFor, setPickerFor] = useState<string | null>(null);
	const [selectedEpic, setSelectedEpic] = useState<string>('');
	const [addedTo, setAddedTo] = useState<Record<string, string>>({});

	useEffect(() => {
		loadAll();
	}, []);

	async function loadAll() {
		setLoading(true);
		setError('');
		try {
			const [msgRes, boardRes] = await Promise.all([
				fetch('/api/admin/messages'),
				fetch('/api/admin/board'),
			]);
			const msgBody = await msgRes.json();
			const boardBody = await boardRes.json();
			if (!msgRes.ok) throw new Error(msgBody.error || 'Failed to load messages');
			const normalized = (msgBody.messages || []).map((m: any) => ({
				...m,
				responded: Boolean(m.responded),
			}));
			setMessages(normalized);
			if (boardRes.ok) {
				const list = (boardBody.epics || []).slice().sort((a: Epic, b: Epic) =>
					(a.order ?? 0) - (b.order ?? 0),
				);
				setEpics(list);
				if (list.length > 0) setSelectedEpic(list[0].id);
			}
		} catch (err: any) {
			setError(err.message || 'Failed to load');
		} finally {
			setLoading(false);
		}
	}

	async function toggleResponded(id: string, nextResponded: boolean) {
		setMessages((prev) =>
			prev.map((m) => (m.id === id ? { ...m, responded: nextResponded } : m)),
		);
		try {
			const res = await fetch(`/api/admin/messages/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ responded: nextResponded }),
			});
			if (!res.ok) throw new Error('patch failed');
		} catch {
			setMessages((prev) =>
				prev.map((m) => (m.id === id ? { ...m, responded: !nextResponded } : m)),
			);
		}
	}

	async function remove(id: string) {
		if (!confirm('Delete this message? This cannot be undone.')) return;
		const backup = messages;
		setMessages((prev) => prev.filter((m) => m.id !== id));
		try {
			const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('delete failed');
		} catch {
			setMessages(backup);
			alert('Delete failed. Please try again.');
		}
	}

	async function addToRoadmap(message: Message, epicId: string) {
		const epic = epics.find((e) => e.id === epicId);
		if (!epic) return;
		try {
			const res = await fetch('/api/admin/board/features', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					epicId,
					title: `Message from ${message.name}`,
					description: `${message.email}\n\n${message.message}`,
					order: Date.now(),
				}),
			});
			if (!res.ok) throw new Error('create failed');
			setAddedTo((prev) => ({ ...prev, [message.id]: epic.name }));
			setPickerFor(null);
		} catch {
			alert('Failed to add to roadmap. Please try again.');
		}
	}

	const openCount = messages.filter((m) => !m.responded).length;

	return (
		<div>
			<div style={styles.header}>
				<h1 style={styles.pageTitle}>Messages</h1>
				<span style={styles.stat}>
					{messages.length} total
					{openCount > 0 ? ` · ${openCount} awaiting response` : ''}
				</span>
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{loading ? (
				<div style={styles.loading}>Loading messages…</div>
			) : messages.length === 0 ? (
				<div style={styles.empty}>No contact messages yet.</div>
			) : (
				<div style={styles.list}>
					{messages.map((m) => {
						const isExpanded = expanded === m.id;
						const cardStyle: React.CSSProperties = {
							...styles.card,
							borderLeftColor: m.responded ? '#cbd5e1' : '#4A9B6B',
							opacity: m.responded ? 0.7 : 1,
							background: m.responded ? '#f8fafc' : '#fff',
						};
						return (
							<div key={m.id} style={cardStyle}>
								<button
									type="button"
									style={styles.cardHeader}
									onClick={() => setExpanded(isExpanded ? null : m.id)}
								>
									<div style={styles.meta}>
										<span
											style={{
												...styles.name,
												color: m.responded ? '#64748b' : '#1e293b',
											}}
										>
											{m.name}
										</span>
										<a
											style={{
												...styles.email,
												color: m.responded ? '#94a3b8' : '#4A9B6B',
											}}
											href={`mailto:${m.email}`}
											onClick={(e) => e.stopPropagation()}
										>
											{m.email}
										</a>
										{m.responded ? (
											<span style={styles.respondedPill}>✓ Responded</span>
										) : (
											<span style={styles.openDot} aria-label="awaiting response" />
										)}
									</div>
									<div style={styles.time}>{relativeTime(m.createdAt)}</div>
								</button>

								<div style={styles.snippet}>
									{isExpanded
										? m.message
										: m.message.slice(0, 120) + (m.message.length > 120 ? '…' : '')}
								</div>

								{isExpanded && (
									<div style={styles.actions}>
										<button
											type="button"
											style={m.responded ? styles.secondary : styles.primary}
											onClick={() => toggleResponded(m.id, !m.responded)}
										>
											{m.responded ? 'Mark not responded' : 'Mark responded'}
										</button>

										{pickerFor === m.id ? (
											<div style={styles.picker}>
												<select
													style={styles.select}
													value={selectedEpic}
													onChange={(e) => setSelectedEpic(e.target.value)}
												>
													{epics.map((e) => (
														<option key={e.id} value={e.id}>
															{e.name}
														</option>
													))}
												</select>
												<button
													type="button"
													style={styles.primary}
													onClick={() => addToRoadmap(m, selectedEpic)}
													disabled={!selectedEpic}
												>
													Add
												</button>
												<button
													type="button"
													style={styles.secondary}
													onClick={() => setPickerFor(null)}
												>
													Cancel
												</button>
											</div>
										) : addedTo[m.id] ? (
											<span style={styles.addedBadge}>✓ Added to "{addedTo[m.id]}"</span>
										) : (
											<button
												type="button"
												style={styles.secondary}
												onClick={() => setPickerFor(m.id)}
												disabled={epics.length === 0}
												title={epics.length === 0 ? 'Create an epic on the Roadmap page first' : undefined}
											>
												Add to Roadmap
											</button>
										)}

										<button
											type="button"
											style={styles.danger}
											onClick={() => remove(m.id)}
										>
											Delete
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	header: {
		display: 'flex',
		alignItems: 'center',
		gap: '1rem',
		marginBottom: '1.5rem',
	},
	pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' },
	stat: {
		fontSize: '0.8rem',
		color: '#94a3b8',
		background: '#f1f5f9',
		padding: '0.2rem 0.6rem',
		borderRadius: '4px',
		fontWeight: 500,
	},
	error: {
		background: '#fef2f2',
		color: '#dc2626',
		padding: '1rem',
		borderRadius: '8px',
		marginBottom: '1rem',
		fontSize: '0.9rem',
	},
	loading: { textAlign: 'center', padding: '4rem', color: '#94a3b8' },
	empty: {
		textAlign: 'center',
		padding: '2rem 1rem',
		color: '#94a3b8',
		fontSize: '0.9rem',
		background: '#f8fafc',
		border: '1px dashed #e2e8f0',
		borderRadius: '12px',
	},
	list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
	card: {
		borderRadius: '12px',
		border: '1px solid #e2e8f0',
		borderLeft: '4px solid #4A9B6B',
		padding: '1rem 1.25rem',
		boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
		transition: 'opacity 0.15s ease, background 0.15s ease',
	},
	cardHeader: {
		all: 'unset',
		cursor: 'pointer',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: '1rem',
		width: '100%',
	},
	meta: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
	name: { fontSize: '0.95rem', fontWeight: 600 },
	email: { fontSize: '0.85rem', textDecoration: 'none' },
	openDot: {
		width: '8px',
		height: '8px',
		borderRadius: '50%',
		background: '#4A9B6B',
		display: 'inline-block',
	},
	respondedPill: {
		fontSize: '0.7rem',
		fontWeight: 600,
		letterSpacing: '0.02em',
		background: 'rgba(74, 155, 107, 0.12)',
		color: '#2f6b4a',
		padding: '0.15rem 0.5rem',
		borderRadius: '999px',
		whiteSpace: 'nowrap',
	},
	time: { fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' },
	snippet: {
		marginTop: '0.5rem',
		fontSize: '0.9rem',
		color: '#475569',
		lineHeight: 1.5,
		whiteSpace: 'pre-wrap',
	},
	actions: {
		marginTop: '0.85rem',
		display: 'flex',
		gap: '0.5rem',
		flexWrap: 'wrap',
		alignItems: 'center',
	},
	picker: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
	},
	select: {
		padding: '0.4rem 0.6rem',
		borderRadius: '6px',
		border: '1px solid #e2e8f0',
		background: '#fff',
		fontSize: '0.85rem',
		fontFamily: 'inherit',
		color: '#1e293b',
	},
	addedBadge: {
		fontSize: '0.8rem',
		fontWeight: 600,
		background: 'rgba(74, 155, 107, 0.12)',
		color: '#2f6b4a',
		padding: '0.4rem 0.75rem',
		borderRadius: '6px',
	},
	primary: {
		padding: '0.4rem 0.85rem',
		borderRadius: '6px',
		border: 'none',
		background: '#4A9B6B',
		color: '#fff',
		fontSize: '0.8rem',
		fontWeight: 600,
		cursor: 'pointer',
		fontFamily: 'inherit',
	},
	secondary: {
		padding: '0.4rem 0.85rem',
		borderRadius: '6px',
		border: '1px solid #e2e8f0',
		background: '#fff',
		color: '#475569',
		fontSize: '0.8rem',
		fontWeight: 500,
		cursor: 'pointer',
		fontFamily: 'inherit',
	},
	danger: {
		padding: '0.4rem 0.85rem',
		borderRadius: '6px',
		border: 'none',
		background: '#fee2e2',
		color: '#b91c1c',
		fontSize: '0.8rem',
		fontWeight: 500,
		cursor: 'pointer',
		fontFamily: 'inherit',
	},
};

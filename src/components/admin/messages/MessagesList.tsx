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

interface Epic { id: string; name: string; order?: number }

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
		setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, responded: nextResponded } : m)));
		try {
			const res = await fetch(`/api/admin/messages/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ responded: nextResponded }),
			});
			if (!res.ok) throw new Error('patch failed');
		} catch {
			setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, responded: !nextResponded } : m)));
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
			<header className="mb-8">
				<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70 mb-2">Messages</p>
				<div className="flex items-baseline justify-between gap-3 flex-wrap">
					<h1 className="italic text-[44px] font-light tracking-[-0.03em] leading-none text-ink">
						{messages.length} message{messages.length === 1 ? '' : 's'}
					</h1>
					<span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
						{openCount > 0 ? `${openCount} awaiting response` : 'all caught up'}
					</span>
				</div>
			</header>

			{error && (
				<div className="bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-4 py-3 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-hairline rounded-lg">
					Loading messages…
				</div>
			) : messages.length === 0 ? (
				<div className="font-mono text-[12px] text-muted text-center py-10 bg-surface border border-dashed border-hairline rounded-lg">
					No contact messages yet.
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{messages.map((m) => {
						const isExpanded = expanded === m.id;
						return (
							<div
								key={m.id}
								className={`border rounded-lg p-5 transition-colors ${
									m.responded ? 'bg-mint-wash border-hairline' : 'bg-surface border-hairline'
								}`}
							>
								<button
									type="button"
									className="w-full flex items-center justify-between gap-3 bg-transparent border-0 p-0 m-0 cursor-pointer text-left"
									onClick={() => setExpanded(isExpanded ? null : m.id)}
								>
									<div className="flex items-center gap-3 min-w-0 flex-wrap">
										<span className={`text-[15px] font-medium ${m.responded ? 'text-muted' : 'text-ink'}`}>
											{m.name}
										</span>
										<a
											className={`text-[12.5px] ${m.responded ? 'text-forest/70 hover:underline' : 'text-accent hover:underline'}`}
											href={`mailto:${m.email}`}
											onClick={(e) => e.stopPropagation()}
										>
											{m.email}
										</a>
										{m.responded ? (
											<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-forest border border-forest/30 bg-mint rounded px-2 py-0.5">
												✓ Responded
											</span>
										) : (
											<span className="w-2 h-2 rounded-full bg-accent" aria-label="awaiting response" />
										)}
									</div>
									<span className="font-mono text-[11px] text-muted whitespace-nowrap">
										{relativeTime(m.createdAt)}
									</span>
								</button>

								<div className="mt-2 text-[14px] text-ink/80 leading-relaxed whitespace-pre-wrap">
									{isExpanded
										? m.message
										: m.message.slice(0, 120) + (m.message.length > 120 ? '…' : '')}
								</div>

								{isExpanded && (
									<div className="mt-4 flex gap-2 flex-wrap items-center">
										<button
											type="button"
											className={
												m.responded
													? 'px-3.5 py-1.5 rounded-md border border-hairline bg-surface text-[12.5px] text-ink hover:border-ink transition-colors'
													: 'px-3.5 py-1.5 rounded-md bg-forest text-surface text-[12.5px] font-medium hover:bg-ink transition-colors'
											}
											onClick={() => toggleResponded(m.id, !m.responded)}
										>
											{m.responded ? 'Mark not responded' : 'Mark responded'}
										</button>

										{pickerFor === m.id ? (
											<div className="flex items-center gap-2">
												<select
													className="px-2.5 py-1.5 bg-surface border border-hairline rounded-md text-[12.5px] text-ink outline-none focus:border-accent"
													value={selectedEpic}
													onChange={(e) => setSelectedEpic(e.target.value)}
												>
													{epics.map((e) => (
														<option key={e.id} value={e.id}>{e.name}</option>
													))}
												</select>
												<button
													type="button"
													className="px-3.5 py-1.5 rounded-md bg-accent text-surface text-[12.5px] font-medium hover:bg-ink transition-colors disabled:opacity-60"
													onClick={() => addToRoadmap(m, selectedEpic)}
													disabled={!selectedEpic}
												>
													Add
												</button>
												<button
													type="button"
													className="px-3.5 py-1.5 rounded-md border border-hairline bg-surface text-[12.5px] text-ink hover:border-ink transition-colors"
													onClick={() => setPickerFor(null)}
												>
													Cancel
												</button>
											</div>
										) : addedTo[m.id] ? (
											<span className="font-mono text-[11px] uppercase tracking-[0.12em] bg-mint text-forest border border-forest/30 rounded-md px-2.5 py-1">
												✓ Added to "{addedTo[m.id]}"
											</span>
										) : (
											<button
												type="button"
												className="px-3.5 py-1.5 rounded-md border border-hairline bg-surface text-[12.5px] text-ink hover:border-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												onClick={() => setPickerFor(m.id)}
												disabled={epics.length === 0}
												title={epics.length === 0 ? 'Create an epic on the Roadmap page first' : undefined}
											>
												Add to Roadmap
											</button>
										)}

										<button
											type="button"
											className="ml-auto px-3.5 py-1.5 rounded-md text-alarm text-[12.5px] hover:bg-alarm-wash transition-colors"
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

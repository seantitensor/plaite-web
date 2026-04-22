import { useEffect, useMemo, useRef, useState } from 'react';
import {
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Epic, Feature, FeatureStatus } from './types';
import { STATUS_LABELS } from './types';
import EpicSection from './EpicSection';
import AddEpicForm from './AddEpicForm';
import { computeOrder, nextOrder, sortByOrder } from './orderUtils';

type DragType = 'epic' | 'feature' | null;
type StatusFilter = 'all' | FeatureStatus;

export default function EpicBoard() {
	const [epics, setEpics] = useState<Epic[]>([]);
	const [features, setFeatures] = useState<Feature[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeType, setActiveType] = useState<DragType>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	const [showArchived, setShowArchived] = useState(false);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [labelFilter, setLabelFilter] = useState<string>('');

	const [collapseVersion, setCollapseVersion] = useState(0);

	const dragOriginRef = useRef<{ epicId: string; order: number } | null>(null);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	useEffect(() => { loadBoard(); }, []);

	async function loadBoard() {
		setLoading(true);
		try {
			const res = await fetch('/api/admin/board');
			const body = await res.json();
			if (!res.ok) { console.error('Failed to load board:', res.status, body); return; }
			setEpics(sortByOrder(body.epics || []));
			setFeatures(body.features || []);
		} catch (err) {
			console.error('Failed to load board:', err);
		} finally {
			setLoading(false);
		}
	}

	const sortedEpics = useMemo(() => sortByOrder(epics), [epics]);
	const epicIds = useMemo(() => sortedEpics.map((e) => `epic-${e.id}`), [sortedEpics]);

	const allLabels = useMemo(() => {
		const set = new Set<string>();
		for (const f of features) for (const l of f.labels || []) set.add(l);
		return Array.from(set).sort();
	}, [features]);

	const archivedCount = features.filter((f) => f.archived).length;

	function featuresForEpic(epicId: string): Feature[] {
		return features.filter((f) => {
			if (f.epicId !== epicId) return false;
			if (!showArchived && f.archived) return false;
			if (statusFilter !== 'all' && (f.status ?? 'not_started') !== statusFilter) return false;
			if (labelFilter && !(f.labels ?? []).includes(labelFilter)) return false;
			return true;
		});
	}

	async function addEpic(name: string) {
		const order = nextOrder(sortedEpics);
		const res = await fetch('/api/admin/board/epics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, order }),
		});
		if (res.ok) { const epic = await res.json(); setEpics((prev) => [...prev, epic]); }
	}

	async function renameEpic(epicId: string, name: string) {
		setEpics((prev) => prev.map((e) => (e.id === epicId ? { ...e, name } : e)));
		await fetch(`/api/admin/board/epics/${epicId}`, {
			method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
		});
	}

	async function deleteEpic(epicId: string) {
		setEpics((prev) => prev.filter((e) => e.id !== epicId));
		setFeatures((prev) => prev.filter((f) => f.epicId !== epicId));
		await fetch(`/api/admin/board/epics/${epicId}`, { method: 'DELETE' });
	}

	async function persistEpicOrder(epicId: string, order: number) {
		await fetch(`/api/admin/board/epics/${epicId}`, {
			method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }),
		});
	}

	async function addFeature(epicId: string, title: string) {
		const siblings = sortByOrder(featuresForEpic(epicId));
		const order = nextOrder(siblings);
		const res = await fetch('/api/admin/board/features', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ epicId, title, order }),
		});
		if (res.ok) { const feature = await res.json(); setFeatures((prev) => [...prev, feature]); }
	}

	async function updateFeature(featureId: string, updates: Partial<Feature>) {
		setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, ...updates } : f)));
		await fetch(`/api/admin/board/features/${featureId}`, {
			method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
		});
	}

	async function deleteFeature(featureId: string) {
		setFeatures((prev) => prev.filter((f) => f.id !== featureId));
		await fetch(`/api/admin/board/features/${featureId}`, { method: 'DELETE' });
	}

	function parseId(id: string): { type: 'epic' | 'feature' | 'todo' | 'epic-drop'; rest: string } | null {
		if (id.startsWith('epic-drop-')) return { type: 'epic-drop', rest: id.slice('epic-drop-'.length) };
		if (id.startsWith('epic-')) return { type: 'epic', rest: id.slice('epic-'.length) };
		if (id.startsWith('feature-')) return { type: 'feature', rest: id.slice('feature-'.length) };
		if (id.startsWith('todo-')) return { type: 'todo', rest: id.slice('todo-'.length) };
		return null;
	}

	function handleDragStart(event: DragStartEvent) {
		const parsed = parseId(String(event.active.id));
		if (!parsed) return;
		setCollapseVersion((v) => v + 1);
		if (parsed.type === 'epic') {
			setActiveType('epic'); setActiveId(parsed.rest);
		} else if (parsed.type === 'feature') {
			const feature = features.find((f) => f.id === parsed.rest);
			if (!feature) return;
			setActiveType('feature'); setActiveId(parsed.rest);
			dragOriginRef.current = { epicId: feature.epicId, order: feature.order };
		}
	}

	function handleDragOver(event: DragOverEvent) {
		const { active, over } = event;
		if (!over) return;
		const activeParsed = parseId(String(active.id));
		const overParsed = parseId(String(over.id));
		if (!activeParsed || !overParsed) return;
		if (activeParsed.type !== 'feature') return;
		const activeFeature = features.find((f) => f.id === activeParsed.rest);
		if (!activeFeature) return;
		let targetEpicId: string | null = null;
		if (overParsed.type === 'feature') {
			const overFeature = features.find((f) => f.id === overParsed.rest);
			if (overFeature) targetEpicId = overFeature.epicId;
		} else if (overParsed.type === 'epic-drop') { targetEpicId = overParsed.rest; }
		else if (overParsed.type === 'epic') { targetEpicId = overParsed.rest; }
		if (targetEpicId && targetEpicId !== activeFeature.epicId) {
			setFeatures((prev) =>
				prev.map((f) => (f.id === activeFeature.id ? { ...f, epicId: targetEpicId! } : f)),
			);
		}
	}

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		const activeParsed = parseId(String(active.id));
		const origin = dragOriginRef.current;
		setActiveType(null); setActiveId(null); dragOriginRef.current = null;
		if (!activeParsed || !over) return;
		const overParsed = parseId(String(over.id));
		if (!overParsed) return;

		if (activeParsed.type === 'epic' && overParsed.type === 'epic') {
			if (activeParsed.rest === overParsed.rest) return;
			const activeEpic = epics.find((e) => e.id === activeParsed.rest);
			const overEpic = epics.find((e) => e.id === overParsed.rest);
			if (!activeEpic || !overEpic) return;
			const siblings = sortedEpics.filter((e) => e.id !== activeParsed.rest);
			let targetIndex = siblings.findIndex((e) => e.id === overParsed.rest);
			if (targetIndex === -1) return;
			if (activeEpic.order < overEpic.order) targetIndex += 1;
			const newOrder = computeOrder(siblings, targetIndex);
			setEpics((prev) => prev.map((e) => (e.id === activeParsed.rest ? { ...e, order: newOrder } : e)));
			await persistEpicOrder(activeParsed.rest, newOrder);
			return;
		}

		if (activeParsed.type === 'feature') {
			const featureId = activeParsed.rest;
			const activeFeature = features.find((f) => f.id === featureId);
			if (!activeFeature) return;
			const targetEpicId = activeFeature.epicId;
			const siblings = sortByOrder(features.filter((f) => f.epicId === targetEpicId && f.id !== featureId));
			let targetIndex: number;
			if (overParsed.type === 'feature' && overParsed.rest !== featureId) {
				targetIndex = siblings.findIndex((f) => f.id === overParsed.rest);
				if (targetIndex === -1) targetIndex = siblings.length;
				if (origin && origin.epicId === targetEpicId) {
					const overFeature = features.find((f) => f.id === overParsed.rest);
					if (overFeature && origin.order < overFeature.order) targetIndex += 1;
				}
			} else {
				targetIndex = siblings.length;
			}
			const newOrder = computeOrder(siblings, targetIndex);
			const unchanged = origin && origin.epicId === targetEpicId && origin.order === newOrder;
			setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, epicId: targetEpicId, order: newOrder } : f)));
			if (!unchanged) {
				await fetch(`/api/admin/board/features/${featureId}`, {
					method: 'PUT', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ epicId: targetEpicId, order: newOrder }),
				});
			}
			return;
		}
	}

	if (loading) {
		return <div className="font-mono text-[12px] text-muted text-center py-16">Loading roadmap…</div>;
	}

	const totalFeatures = features.length;
	const filtersActive = statusFilter !== 'all' || labelFilter || showArchived;

	return (
		<div>
			<header className="mb-6">
				<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70 mb-2">Roadmap</p>
				<div className="flex items-baseline justify-between gap-3 flex-wrap">
					<h1 className="italic text-[44px] font-light tracking-[-0.03em] leading-none text-ink">
						{epics.length} epic{epics.length === 1 ? '' : 's'} · {totalFeatures} feature{totalFeatures === 1 ? '' : 's'}
					</h1>
				</div>
			</header>

			{/* Filter bar */}
			<div className="flex items-center gap-4 mb-6 px-4 py-3 bg-surface border border-hairline rounded-lg flex-wrap">
				<label className="flex items-center gap-2">
					<span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">Status</span>
					<select
						className="px-2.5 py-1.5 bg-canvas border border-hairline rounded-md text-[12.5px] text-ink outline-none focus:border-accent"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
					>
						<option value="all">All</option>
						<option value="not_started">{STATUS_LABELS.not_started}</option>
						<option value="in_progress">{STATUS_LABELS.in_progress}</option>
						<option value="done">{STATUS_LABELS.done}</option>
					</select>
				</label>

				{allLabels.length > 0 && (
					<label className="flex items-center gap-2">
						<span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">Label</span>
						<select
							className="px-2.5 py-1.5 bg-canvas border border-hairline rounded-md text-[12.5px] text-ink outline-none focus:border-accent"
							value={labelFilter}
							onChange={(e) => setLabelFilter(e.target.value)}
						>
							<option value="">All</option>
							{allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
						</select>
					</label>
				)}

				<label className="flex items-center gap-2 text-[12.5px] text-ink cursor-pointer">
					<input
						type="checkbox"
						checked={showArchived}
						onChange={(e) => setShowArchived(e.target.checked)}
						className="w-[14px] h-[14px] accent-forest"
					/>
					<span>Show archived{archivedCount > 0 ? ` (${archivedCount})` : ''}</span>
				</label>

				{filtersActive && (
					<button
						type="button"
						className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-accent hover:text-ink transition-colors bg-transparent border-0 cursor-pointer"
						onClick={() => { setStatusFilter('all'); setLabelFilter(''); setShowArchived(false); }}
					>
						Clear filters
					</button>
				)}
			</div>

			<DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
				<SortableContext items={epicIds} strategy={verticalListSortingStrategy}>
					{sortedEpics.map((epic) => (
						<EpicSection
							key={epic.id}
							epic={epic}
							features={featuresForEpic(epic.id)}
							collapseVersion={collapseVersion}
							onRename={(name) => renameEpic(epic.id, name)}
							onDelete={() => deleteEpic(epic.id)}
							onFeatureAdd={addFeature}
							onFeatureUpdate={updateFeature}
							onFeatureDelete={deleteFeature}
						/>
					))}
				</SortableContext>

				<DragOverlay>
					{activeType === 'epic' && activeId && (
						<div className="bg-surface border border-accent rounded-lg px-4 py-3 italic text-[18px] font-normal tracking-[-0.01em] text-ink shadow-lift">
							{epics.find((e) => e.id === activeId)?.name}
						</div>
					)}
					{activeType === 'feature' && activeId && (
						<div className="bg-surface border border-accent rounded-md px-3.5 py-2 text-[14px] font-medium text-ink shadow-lift">
							{features.find((f) => f.id === activeId)?.title}
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{sortedEpics.length === 0 && (
				<div className="font-mono text-[12px] text-muted text-center py-8 bg-surface border border-dashed border-hairline rounded-lg">
					No epics yet. Create your first one below.
				</div>
			)}

			<AddEpicForm onAdd={addEpic} />
		</div>
	);
}

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
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Epic, Feature } from './types';
import EpicSection from './EpicSection';
import AddEpicForm from './AddEpicForm';
import { computeOrder, nextOrder, sortByOrder } from './orderUtils';

type DragType = 'epic' | 'feature' | null;

export default function EpicBoard() {
	const [epics, setEpics] = useState<Epic[]>([]);
	const [features, setFeatures] = useState<Feature[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeType, setActiveType] = useState<DragType>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	// Snapshot feature placement before drag start so we can persist only the final location.
	const dragOriginRef = useRef<{ epicId: string; order: number } | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	useEffect(() => {
		loadBoard();
	}, []);

	async function loadBoard() {
		setLoading(true);
		try {
			const res = await fetch('/api/admin/board');
			const body = await res.json();
			if (!res.ok) {
				console.error('Failed to load board:', res.status, body);
				return;
			}
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

	function featuresForEpic(epicId: string): Feature[] {
		return features.filter((f) => f.epicId === epicId);
	}

	// ---------- Epic mutations ----------

	async function addEpic(name: string) {
		const order = nextOrder(sortedEpics);
		const res = await fetch('/api/admin/board/epics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, order }),
		});
		if (res.ok) {
			const epic = await res.json();
			setEpics((prev) => [...prev, epic]);
		}
	}

	async function renameEpic(epicId: string, name: string) {
		setEpics((prev) => prev.map((e) => (e.id === epicId ? { ...e, name } : e)));
		await fetch(`/api/admin/board/epics/${epicId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
	}

	async function deleteEpic(epicId: string) {
		setEpics((prev) => prev.filter((e) => e.id !== epicId));
		setFeatures((prev) => prev.filter((f) => f.epicId !== epicId));
		await fetch(`/api/admin/board/epics/${epicId}`, { method: 'DELETE' });
	}

	async function persistEpicOrder(epicId: string, order: number) {
		await fetch(`/api/admin/board/epics/${epicId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ order }),
		});
	}

	// ---------- Feature mutations ----------

	async function addFeature(epicId: string, title: string) {
		const siblings = sortByOrder(featuresForEpic(epicId));
		const order = nextOrder(siblings);
		const res = await fetch('/api/admin/board/features', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ epicId, title, order }),
		});
		if (res.ok) {
			const feature = await res.json();
			setFeatures((prev) => [...prev, feature]);
		}
	}

	async function updateFeature(featureId: string, updates: Partial<Feature>) {
		setFeatures((prev) =>
			prev.map((f) => (f.id === featureId ? { ...f, ...updates } : f)),
		);
		await fetch(`/api/admin/board/features/${featureId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates),
		});
	}

	async function deleteFeature(featureId: string) {
		setFeatures((prev) => prev.filter((f) => f.id !== featureId));
		await fetch(`/api/admin/board/features/${featureId}`, { method: 'DELETE' });
	}

	// ---------- Drag & drop ----------

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

		if (parsed.type === 'epic') {
			setActiveType('epic');
			setActiveId(parsed.rest);
		} else if (parsed.type === 'feature') {
			const feature = features.find((f) => f.id === parsed.rest);
			if (!feature) return;
			setActiveType('feature');
			setActiveId(parsed.rest);
			dragOriginRef.current = { epicId: feature.epicId, order: feature.order };
		}
	}

	function handleDragOver(event: DragOverEvent) {
		const { active, over } = event;
		if (!over) return;

		const activeParsed = parseId(String(active.id));
		const overParsed = parseId(String(over.id));
		if (!activeParsed || !overParsed) return;

		// Only handle feature moves between epics during drag-over
		if (activeParsed.type !== 'feature') return;

		const activeFeature = features.find((f) => f.id === activeParsed.rest);
		if (!activeFeature) return;

		let targetEpicId: string | null = null;
		if (overParsed.type === 'feature') {
			const overFeature = features.find((f) => f.id === overParsed.rest);
			if (overFeature) targetEpicId = overFeature.epicId;
		} else if (overParsed.type === 'epic-drop') {
			targetEpicId = overParsed.rest;
		} else if (overParsed.type === 'epic') {
			targetEpicId = overParsed.rest;
		}

		if (targetEpicId && targetEpicId !== activeFeature.epicId) {
			setFeatures((prev) =>
				prev.map((f) =>
					f.id === activeFeature.id ? { ...f, epicId: targetEpicId! } : f,
				),
			);
		}
	}

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		const activeParsed = parseId(String(active.id));
		const origin = dragOriginRef.current;

		setActiveType(null);
		setActiveId(null);
		dragOriginRef.current = null;

		if (!activeParsed || !over) return;

		const overParsed = parseId(String(over.id));
		if (!overParsed) return;

		// ----- Epic reorder -----
		if (activeParsed.type === 'epic' && overParsed.type === 'epic') {
			if (activeParsed.rest === overParsed.rest) return;
			const siblings = sortedEpics.filter((e) => e.id !== activeParsed.rest);
			const overIndex = siblings.findIndex((e) => e.id === overParsed.rest);
			if (overIndex === -1) return;
			const newOrder = computeOrder(siblings, overIndex);

			setEpics((prev) => prev.map((e) => (e.id === activeParsed.rest ? { ...e, order: newOrder } : e)));
			await persistEpicOrder(activeParsed.rest, newOrder);
			return;
		}

		// ----- Feature reorder / move -----
		if (activeParsed.type === 'feature') {
			const featureId = activeParsed.rest;
			// Use the live features state (reflects onDragOver epic change)
			const activeFeature = features.find((f) => f.id === featureId);
			if (!activeFeature) return;
			const targetEpicId = activeFeature.epicId;

			// Siblings in the target epic, excluding the active feature
			const siblings = sortByOrder(
				features.filter((f) => f.epicId === targetEpicId && f.id !== featureId),
			);

			let targetIndex: number;
			if (overParsed.type === 'feature' && overParsed.rest !== featureId) {
				targetIndex = siblings.findIndex((f) => f.id === overParsed.rest);
				if (targetIndex === -1) targetIndex = siblings.length;
			} else {
				// Dropped on the epic body / empty drop zone → append
				targetIndex = siblings.length;
			}

			const newOrder = computeOrder(siblings, targetIndex);

			// Did anything actually change?
			const unchanged =
				origin &&
				origin.epicId === targetEpicId &&
				origin.order === newOrder;

			setFeatures((prev) =>
				prev.map((f) =>
					f.id === featureId ? { ...f, epicId: targetEpicId, order: newOrder } : f,
				),
			);

			if (!unchanged) {
				await fetch(`/api/admin/board/features/${featureId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ epicId: targetEpicId, order: newOrder }),
				});
			}
			return;
		}
	}

	// ---------- Render ----------

	if (loading) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
				Loading roadmap...
			</div>
		);
	}

	const totalFeatures = features.length;

	return (
		<div>
			<div style={styles.header}>
				<h1 style={styles.pageTitle}>Roadmap</h1>
				<span style={styles.stat}>
					{epics.length} epic{epics.length === 1 ? '' : 's'} · {totalFeatures} feature
					{totalFeatures === 1 ? '' : 's'}
				</span>
			</div>

			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<SortableContext items={epicIds} strategy={verticalListSortingStrategy}>
					{sortedEpics.map((epic) => (
						<EpicSection
							key={epic.id}
							epic={epic}
							features={featuresForEpic(epic.id)}
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
						<div style={styles.overlayEpic}>
							{epics.find((e) => e.id === activeId)?.name}
						</div>
					)}
					{activeType === 'feature' && activeId && (
						<div style={styles.overlayFeature}>
							{features.find((f) => f.id === activeId)?.title}
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{sortedEpics.length === 0 && (
				<div style={styles.empty}>
					No epics yet. Create your first one below — think "Current Features",
					"Next Release", or "Ideas".
				</div>
			)}

			<AddEpicForm onAdd={addEpic} />
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
	pageTitle: {
		fontSize: '1.5rem',
		fontWeight: 700,
		color: '#1e293b',
	},
	stat: {
		fontSize: '0.8rem',
		color: '#94a3b8',
		background: '#f1f5f9',
		padding: '0.2rem 0.6rem',
		borderRadius: '4px',
		fontWeight: 500,
	},
	overlayEpic: {
		background: '#fff',
		border: '1px solid #4A9B6B',
		borderRadius: '12px',
		padding: '0.85rem 1rem',
		fontSize: '1rem',
		fontWeight: 600,
		color: '#1e293b',
		boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
	},
	overlayFeature: {
		background: '#fff',
		border: '1px solid #4A9B6B',
		borderRadius: '8px',
		padding: '0.65rem 0.9rem',
		fontSize: '0.9rem',
		fontWeight: 500,
		color: '#1e293b',
		boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
	},
	empty: {
		textAlign: 'center',
		padding: '2rem 1rem',
		color: '#94a3b8',
		fontSize: '0.9rem',
		background: '#f8fafc',
		border: '1px dashed #e2e8f0',
		borderRadius: '12px',
	},
};

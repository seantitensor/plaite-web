import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	type Feature,
	type Todo,
	type FeatureStatus,
	type FeaturePriority,
	STATUS_LABELS,
	PRIORITY_LABELS,
	cycleStatus,
	cyclePriority,
} from './types';
import TodoList from './TodoList';
import { labelColor } from '../../../lib/labelColor';

interface Props {
	feature: Feature;
	collapseVersion: number;
	onUpdate: (updates: Partial<Feature>) => void;
	onDelete: () => void;
}

// Map statuses to warm-palette pill colors
const STATUS_PILL: Record<FeatureStatus, string> = {
	not_started: 'border-hairline bg-canvas text-muted',
	in_progress: 'border-accent/30 bg-accent-wash text-accent',
	done: 'border-forest/30 bg-mint text-forest',
};

// Priority → color
const PRIORITY_COLOR: Record<FeaturePriority, string> = {
	p0: 'text-alarm',
	p1: 'text-accent',
	p2: 'text-muted',
};

// Priority → left-border color (for the card stripe)
const PRIORITY_BORDER: Record<FeaturePriority, string> = {
	p0: '#9b4a3a',
	p1: '#8b5a2b',
	p2: '#a8a095',
};

export default function FeatureRow({ feature, collapseVersion, onUpdate, onDelete }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [title, setTitle] = useState(feature.title);
	const [description, setDescription] = useState(feature.description);
	const [labelInput, setLabelInput] = useState('');

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `feature-${feature.id}`,
		data: { type: 'feature', epicId: feature.epicId },
	});

	useEffect(() => { setExpanded(false); }, [collapseVersion]);

	const total = feature.todos.length;
	const done = feature.todos.filter((t) => t.done).length;
	const pct = total === 0 ? 0 : Math.round((done / total) * 100);

	const status: FeatureStatus = feature.status ?? 'not_started';
	const priority: FeaturePriority = feature.priority ?? 'p2';
	const labels = feature.labels ?? [];
	const isArchived = Boolean(feature.archived);

	const wrapperStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : isArchived ? 0.6 : 1,
		borderLeft: `3px solid ${PRIORITY_BORDER[priority]}`,
	};

	function commitTitle() {
		const trimmed = title.trim();
		if (trimmed && trimmed !== feature.title) onUpdate({ title: trimmed });
		else setTitle(feature.title);
	}
	function commitDescription() {
		if (description !== feature.description) onUpdate({ description });
	}
	function handleTodosChange(todos: Todo[]) { onUpdate({ todos }); }
	function handleCycleStatus(e: React.MouseEvent) { e.stopPropagation(); onUpdate({ status: cycleStatus(status) }); }
	function handleCyclePriority(e: React.MouseEvent) { e.stopPropagation(); onUpdate({ priority: cyclePriority(priority) }); }
	function addLabel() {
		const trimmed = labelInput.trim();
		if (!trimmed) return;
		if (labels.includes(trimmed)) { setLabelInput(''); return; }
		onUpdate({ labels: [...labels, trimmed] });
		setLabelInput('');
	}
	function removeLabel(label: string) { onUpdate({ labels: labels.filter((l) => l !== label) }); }
	function toggleArchived() { onUpdate({ archived: !isArchived }); }

	const doneAllTodos = total > 0 && done === total;

	return (
		<div ref={setNodeRef} style={wrapperStyle} className="bg-surface border border-hairline rounded-md mb-2 overflow-hidden">
			<div className="flex items-center gap-2 px-3 py-2.5">
				<span
					{...attributes}
					{...listeners}
					className="cursor-grab text-whisper text-sm select-none"
					style={{ touchAction: 'none' }}
					title="Drag to reorder"
				>
					⋮⋮
				</span>

				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="bg-transparent border-0 text-muted text-[13px] cursor-pointer px-1"
					title={expanded ? 'Collapse' : 'Expand'}
				>
					{expanded ? '▾' : '▸'}
				</button>

				<button
					type="button"
					onClick={handleCyclePriority}
					className={`font-mono text-[11px] font-bold w-6 cursor-pointer bg-transparent border-0 px-1 py-0.5 rounded ${PRIORITY_COLOR[priority]}`}
					title={`Priority ${PRIORITY_LABELS[priority]} — click to change`}
				>
					{PRIORITY_LABELS[priority]}
				</button>

				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					onBlur={commitTitle}
					onKeyDown={(e) => {
						if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
						if (e.key === 'Escape') { setTitle(feature.title); (e.target as HTMLInputElement).blur(); }
					}}
					className={`flex-1 border-0 outline-none bg-transparent text-[14px] font-medium font-sans px-1 min-w-0 ${
						isArchived ? 'line-through text-muted' : 'text-ink'
					}`}
				/>

				<button
					type="button"
					onClick={handleCycleStatus}
					className={`font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded border cursor-pointer whitespace-nowrap transition-colors ${STATUS_PILL[status]}`}
					title="Click to change status"
				>
					{STATUS_LABELS[status]}
				</button>

				{labels.length > 0 && (
					<div className="flex items-center gap-1 flex-shrink-0">
						{labels.slice(0, 3).map((l) => {
							const c = labelColor(l);
							return (
								<span
									key={l}
									className="font-mono text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border"
									style={{ background: c.bg, color: c.fg, borderColor: c.border }}
								>
									{l}
								</span>
							);
						})}
						{labels.length > 3 && (
							<span className="font-mono text-[10px] text-muted">+{labels.length - 3}</span>
						)}
					</div>
				)}

				<div className="flex items-center gap-2 flex-shrink-0">
					<div className="h-1 w-20 bg-hairline rounded-full overflow-hidden">
						<div
							className="h-full transition-[width]"
							style={{ width: `${pct}%`, background: doneAllTodos ? '#3e5544' : '#8b5a2b' }}
						/>
					</div>
					<span className="font-mono text-[10px] text-muted w-8 text-right">{done}/{total}</span>
				</div>
			</div>

			{expanded && (
				<div className="px-3 pb-3 pt-3 border-t border-hairline ml-[2.45rem]">
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onBlur={commitDescription}
						placeholder="Description…"
						rows={2}
						className="w-full bg-surface border border-hairline rounded-md px-2.5 py-1.5 text-[13px] font-sans text-muted outline-none focus:border-accent resize-y box-border"
					/>

					<div className="mt-3">
						<div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-hairline rounded-md bg-surface min-h-[2rem]">
							{labels.map((l) => {
								const c = labelColor(l);
								return (
									<span
										key={l}
										className="font-mono text-[11px] px-1.5 py-0.5 pr-1 rounded-full inline-flex items-center gap-0.5 border"
										style={{ background: c.bg, color: c.fg, borderColor: c.border }}
									>
										{l}
										<button
											type="button"
											onClick={() => removeLabel(l)}
											className="bg-transparent border-0 opacity-60 hover:opacity-100 text-inherit text-[14px] leading-none cursor-pointer px-1"
											aria-label={`Remove label ${l}`}
										>
											×
										</button>
									</span>
								);
							})}
							<input
								type="text"
								value={labelInput}
								onChange={(e) => setLabelInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLabel(); }
									if (e.key === 'Backspace' && !labelInput && labels.length > 0) {
										removeLabel(labels[labels.length - 1]);
									}
								}}
								onBlur={addLabel}
								placeholder={labels.length === 0 ? 'Add labels…' : '+'}
								className="flex-1 border-0 outline-none bg-transparent text-[12.5px] font-sans min-w-[100px] px-1 py-0.5"
							/>
						</div>
					</div>

					<TodoList featureId={feature.id} todos={feature.todos} onChange={handleTodosChange} />

					<div className="flex justify-between items-center mt-3">
						<button
							type="button"
							onClick={toggleArchived}
							className="bg-surface border border-hairline text-ink text-[12px] cursor-pointer px-3 py-1 rounded-md hover:border-ink transition-colors"
						>
							{isArchived ? 'Unarchive' : 'Archive'}
						</button>
						<button
							type="button"
							onClick={() => { if (confirm(`Delete "${feature.title}"?`)) onDelete(); }}
							className="bg-transparent border-0 text-alarm text-[12px] cursor-pointer px-2 py-1 rounded hover:bg-alarm-wash transition-colors"
						>
							Delete feature
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

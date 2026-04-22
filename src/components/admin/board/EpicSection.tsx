import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Epic, Feature } from './types';
import FeatureRow from './FeatureRow';
import AddFeatureForm from './AddFeatureForm';
import { sortByOrder } from './orderUtils';

interface Props {
	epic: Epic;
	features: Feature[];
	collapseVersion: number;
	onRename: (name: string) => void;
	onDelete: () => void;
	onFeatureAdd: (epicId: string, title: string) => Promise<void> | void;
	onFeatureUpdate: (featureId: string, updates: Partial<Feature>) => void;
	onFeatureDelete: (featureId: string) => void;
}

export default function EpicSection({
	epic, features, collapseVersion, onRename, onDelete, onFeatureAdd, onFeatureUpdate, onFeatureDelete,
}: Props) {
	const [name, setName] = useState(epic.name);
	const sortedFeatures = sortByOrder(features);
	const featureIds = sortedFeatures.map((f) => `feature-${f.id}`);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `epic-${epic.id}`, data: { type: 'epic' },
	});
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: `epic-drop-${epic.id}`, data: { type: 'epic-drop', epicId: epic.id },
	});

	const wrapperStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	function commitName() {
		const trimmed = name.trim();
		if (trimmed && trimmed !== epic.name) onRename(trimmed);
		else setName(epic.name);
	}

	function handleDelete() {
		const msg = features.length > 0
			? `Delete "${epic.name}" and its ${features.length} feature${features.length === 1 ? '' : 's'}?`
			: `Delete "${epic.name}"?`;
		if (confirm(msg)) onDelete();
	}

	const activeFeatures = features.filter((f) => !f.archived);
	const perFeatureProgress = activeFeatures.map((f) => {
		if (f.status === 'done') return 1;
		const total = f.todos?.length || 0;
		if (total === 0) return 0;
		const done = f.todos!.filter((t) => t.done).length;
		return done / total;
	});
	const epicPct = perFeatureProgress.length === 0
		? 0
		: Math.round((perFeatureProgress.reduce((s, p) => s + p, 0) / perFeatureProgress.length) * 100);
	const doneFeatures = activeFeatures.filter((f) => f.status === 'done').length;

	return (
		<div ref={setNodeRef} style={wrapperStyle} className="bg-canvas border border-hairline rounded-lg mb-5 overflow-hidden">
			<div className="flex items-center gap-3 px-5 py-3 bg-surface border-b border-hairline">
				<span
					{...attributes}
					{...listeners}
					className="cursor-grab text-whisper text-base select-none"
					style={{ touchAction: 'none' }}
					title="Drag to reorder epic"
				>
					⋮⋮
				</span>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={commitName}
					onKeyDown={(e) => {
						if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
						if (e.key === 'Escape') { setName(epic.name); (e.target as HTMLInputElement).blur(); }
					}}
					className="flex-1 border-0 outline-none bg-transparent italic text-[20px] font-normal tracking-[-0.01em] text-ink font-sans px-1"
				/>

				{activeFeatures.length > 0 && (
					<div className="flex items-center gap-2" title={`${doneFeatures} of ${activeFeatures.length} features done`}>
						<div className="h-1 w-24 bg-hairline rounded-full overflow-hidden">
							<div className="h-full bg-forest transition-[width]" style={{ width: `${epicPct}%` }} />
						</div>
						<span className="font-mono text-[11px] text-forest font-bold">{epicPct}%</span>
					</div>
				)}

				<span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 whitespace-nowrap">
					{doneFeatures}/{activeFeatures.length} done
				</span>

				<button
					type="button"
					onClick={handleDelete}
					className="bg-transparent border-0 text-whisper hover:text-alarm text-[18px] leading-none cursor-pointer px-1 transition-colors"
					title="Delete epic"
				>
					×
				</button>
			</div>

			<div
				ref={setDropRef}
				className={`px-4 py-3 transition-colors ${isOver ? 'bg-mint-wash' : ''}`}
			>
				<SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
					{sortedFeatures.map((feature) => (
						<FeatureRow
							key={feature.id}
							feature={feature}
							collapseVersion={collapseVersion}
							onUpdate={(updates) => onFeatureUpdate(feature.id, updates)}
							onDelete={() => onFeatureDelete(feature.id)}
						/>
					))}
				</SortableContext>

				<AddFeatureForm epicId={epic.id} onAdd={onFeatureAdd} />
			</div>
		</div>
	);
}

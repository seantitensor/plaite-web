import { useState } from 'react';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Epic, Feature } from './types';
import FeatureRow from './FeatureRow';
import AddFeatureForm from './AddFeatureForm';
import { sortByOrder } from './orderUtils';

interface Props {
	epic: Epic;
	features: Feature[];
	onRename: (name: string) => void;
	onDelete: () => void;
	onFeatureAdd: (epicId: string, title: string) => Promise<void> | void;
	onFeatureUpdate: (featureId: string, updates: Partial<Feature>) => void;
	onFeatureDelete: (featureId: string) => void;
}

export default function EpicSection({
	epic,
	features,
	onRename,
	onDelete,
	onFeatureAdd,
	onFeatureUpdate,
	onFeatureDelete,
}: Props) {
	const [name, setName] = useState(epic.name);
	const sortedFeatures = sortByOrder(features);
	const featureIds = sortedFeatures.map((f) => `feature-${f.id}`);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `epic-${epic.id}`,
		data: { type: 'epic' },
	});

	// Droppable zone covering the feature list, so empty epics can still receive drops
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: `epic-drop-${epic.id}`,
		data: { type: 'epic-drop', epicId: epic.id },
	});

	const wrapperStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		...styles.wrapper,
	};

	function commitName() {
		const trimmed = name.trim();
		if (trimmed && trimmed !== epic.name) {
			onRename(trimmed);
		} else {
			setName(epic.name);
		}
	}

	function handleDelete() {
		const msg =
			features.length > 0
				? `Delete "${epic.name}" and its ${features.length} feature${features.length === 1 ? '' : 's'}?`
				: `Delete "${epic.name}"?`;
		if (confirm(msg)) onDelete();
	}

	return (
		<div ref={setNodeRef} style={wrapperStyle}>
			<div style={styles.header}>
				<span
					{...attributes}
					{...listeners}
					style={styles.handle}
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
						if (e.key === 'Escape') {
							setName(epic.name);
							(e.target as HTMLInputElement).blur();
						}
					}}
					style={styles.name}
				/>
				<span style={styles.count}>
					{features.length} feature{features.length === 1 ? '' : 's'}
				</span>
				<button type="button" onClick={handleDelete} style={styles.deleteBtn} title="Delete epic">
					×
				</button>
			</div>

			<div
				ref={setDropRef}
				style={{
					...styles.body,
					background: isOver ? '#f0fdf4' : 'transparent',
				}}
			>
				<SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
					{sortedFeatures.map((feature) => (
						<FeatureRow
							key={feature.id}
							feature={feature}
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

const styles: Record<string, React.CSSProperties> = {
	wrapper: {
		background: '#f8fafc',
		border: '1px solid #e2e8f0',
		borderRadius: '12px',
		marginBottom: '1.25rem',
		overflow: 'hidden',
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '0.85rem 1rem',
		background: '#fff',
		borderBottom: '1px solid #e2e8f0',
	},
	handle: {
		cursor: 'grab',
		color: '#cbd5e1',
		fontSize: '1rem',
		userSelect: 'none',
		touchAction: 'none',
	},
	name: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '1rem',
		fontWeight: 600,
		color: '#1e293b',
		fontFamily: 'Inter, sans-serif',
		padding: '0.15rem 0.25rem',
	},
	count: {
		fontSize: '0.75rem',
		color: '#94a3b8',
		background: '#f1f5f9',
		padding: '0.2rem 0.55rem',
		borderRadius: '10px',
		fontWeight: 500,
	},
	deleteBtn: {
		background: 'none',
		border: 'none',
		color: '#cbd5e1',
		fontSize: '1.25rem',
		lineHeight: 1,
		cursor: 'pointer',
		padding: '0 0.35rem',
	},
	body: {
		padding: '0.85rem 1rem',
		transition: 'background 0.15s ease',
	},
};

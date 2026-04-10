import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Feature, Todo } from './types';
import TodoList from './TodoList';

interface Props {
	feature: Feature;
	onUpdate: (updates: Partial<Feature>) => void;
	onDelete: () => void;
}

export default function FeatureRow({ feature, onUpdate, onDelete }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [title, setTitle] = useState(feature.title);
	const [description, setDescription] = useState(feature.description);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `feature-${feature.id}`,
		data: { type: 'feature', epicId: feature.epicId },
	});

	const total = feature.todos.length;
	const done = feature.todos.filter((t) => t.done).length;
	const pct = total === 0 ? 100 : Math.round((done / total) * 100);

	const wrapperStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		...styles.wrapper,
	};

	function commitTitle() {
		const trimmed = title.trim();
		if (trimmed && trimmed !== feature.title) {
			onUpdate({ title: trimmed });
		} else {
			setTitle(feature.title);
		}
	}

	function commitDescription() {
		if (description !== feature.description) {
			onUpdate({ description });
		}
	}

	function handleTodosChange(todos: Todo[]) {
		onUpdate({ todos });
	}

	return (
		<div ref={setNodeRef} style={wrapperStyle}>
			<div style={styles.row}>
				<span
					{...attributes}
					{...listeners}
					style={styles.handle}
					title="Drag to reorder"
				>
					⋮⋮
				</span>

				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					style={styles.chevron}
					title={expanded ? 'Collapse' : 'Expand'}
				>
					{expanded ? '▾' : '▸'}
				</button>

				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					onBlur={commitTitle}
					onKeyDown={(e) => {
						if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
						if (e.key === 'Escape') {
							setTitle(feature.title);
							(e.target as HTMLInputElement).blur();
						}
					}}
					style={styles.title}
				/>

				<div style={styles.progressWrap}>
					<div style={styles.progressBar}>
						<div style={{ ...styles.progressFill, width: `${pct}%` }} />
					</div>
					<span style={styles.progressLabel}>
						{done}/{total}
					</span>
				</div>
			</div>

			{expanded && (
				<div style={styles.body}>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onBlur={commitDescription}
						placeholder="Description..."
						rows={2}
						style={styles.description}
					/>

					<TodoList
						featureId={feature.id}
						todos={feature.todos}
						onChange={handleTodosChange}
					/>

					<div style={styles.footer}>
						<button type="button" onClick={onDelete} style={styles.deleteBtn}>
							Delete feature
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	wrapper: {
		background: '#fff',
		border: '1px solid #e2e8f0',
		borderRadius: '8px',
		marginBottom: '0.5rem',
		overflow: 'hidden',
	},
	row: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		padding: '0.65rem 0.75rem',
	},
	handle: {
		cursor: 'grab',
		color: '#cbd5e1',
		fontSize: '0.9rem',
		userSelect: 'none',
		touchAction: 'none',
	},
	chevron: {
		background: 'none',
		border: 'none',
		color: '#64748b',
		fontSize: '0.85rem',
		cursor: 'pointer',
		padding: '0 0.15rem',
		width: '1.2rem',
	},
	title: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.9rem',
		fontWeight: 500,
		color: '#1e293b',
		fontFamily: 'Inter, sans-serif',
		padding: '0.15rem 0.25rem',
	},
	progressWrap: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		flexShrink: 0,
	},
	progressBar: {
		width: '100px',
		height: '6px',
		background: '#f1f5f9',
		borderRadius: '3px',
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		background: '#4A9B6B',
		transition: 'width 0.2s ease',
	},
	progressLabel: {
		fontSize: '0.75rem',
		color: '#94a3b8',
		fontVariantNumeric: 'tabular-nums',
		minWidth: '2.5rem',
		textAlign: 'right',
	},
	body: {
		padding: '0 0.75rem 0.75rem 2.45rem',
		borderTop: '1px solid #f1f5f9',
		paddingTop: '0.75rem',
	},
	description: {
		width: '100%',
		border: '1px solid #e2e8f0',
		borderRadius: '4px',
		padding: '0.4rem 0.5rem',
		fontSize: '0.8rem',
		fontFamily: 'Inter, sans-serif',
		resize: 'vertical',
		outline: 'none',
		color: '#475569',
		boxSizing: 'border-box',
	},
	footer: {
		display: 'flex',
		justifyContent: 'flex-end',
		marginTop: '0.75rem',
	},
	deleteBtn: {
		background: 'none',
		border: 'none',
		color: '#dc2626',
		fontSize: '0.75rem',
		cursor: 'pointer',
		padding: '0.25rem 0.5rem',
		fontFamily: 'Inter, sans-serif',
	},
};

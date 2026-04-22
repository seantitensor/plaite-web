import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	type Feature,
	type Todo,
	type FeatureStatus,
	type FeaturePriority,
	STATUS_LABELS,
	STATUS_COLORS,
	PRIORITY_LABELS,
	PRIORITY_COLORS,
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

export default function FeatureRow({ feature, collapseVersion, onUpdate, onDelete }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [title, setTitle] = useState(feature.title);
	const [description, setDescription] = useState(feature.description);
	const [labelInput, setLabelInput] = useState('');

	// Parent bumps collapseVersion on drag start — collapse this row then.
	useEffect(() => {
		setExpanded(false);
	}, [collapseVersion]);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `feature-${feature.id}`,
		data: { type: 'feature', epicId: feature.epicId },
	});

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
		...styles.wrapper,
		borderLeft: `3px solid ${PRIORITY_COLORS[priority]}`,
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

	function handleCycleStatus(e: React.MouseEvent) {
		e.stopPropagation();
		onUpdate({ status: cycleStatus(status) });
	}

	function handleCyclePriority(e: React.MouseEvent) {
		e.stopPropagation();
		onUpdate({ priority: cyclePriority(priority) });
	}

	function addLabel() {
		const trimmed = labelInput.trim();
		if (!trimmed) return;
		if (labels.includes(trimmed)) {
			setLabelInput('');
			return;
		}
		onUpdate({ labels: [...labels, trimmed] });
		setLabelInput('');
	}

	function removeLabel(label: string) {
		onUpdate({ labels: labels.filter((l) => l !== label) });
	}

	function toggleArchived() {
		onUpdate({ archived: !isArchived });
	}

	const statusColor = STATUS_COLORS[status];

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

				<button
					type="button"
					onClick={handleCyclePriority}
					style={{
						...styles.priorityBtn,
						color: PRIORITY_COLORS[priority],
						fontWeight: priority === 'p0' ? 700 : 600,
					}}
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
						if (e.key === 'Escape') {
							setTitle(feature.title);
							(e.target as HTMLInputElement).blur();
						}
					}}
					style={{
						...styles.title,
						textDecoration: isArchived ? 'line-through' : 'none',
						color: isArchived ? '#94a3b8' : '#1e293b',
					}}
				/>

				<button
					type="button"
					onClick={handleCycleStatus}
					style={{
						...styles.statusPill,
						background: statusColor.bg,
						color: statusColor.fg,
						border: `1px solid ${statusColor.border}`,
					}}
					title="Click to change status"
				>
					{STATUS_LABELS[status]}
				</button>

				{labels.length > 0 && (
					<div style={styles.labelsRow}>
						{labels.slice(0, 3).map((l) => {
							const c = labelColor(l);
							return (
								<span
									key={l}
									style={{
										...styles.labelChip,
										background: c.bg,
										color: c.fg,
										border: `1px solid ${c.border}`,
									}}
								>
									{l}
								</span>
							);
						})}
						{labels.length > 3 && (
							<span style={styles.labelMore}>+{labels.length - 3}</span>
						)}
					</div>
				)}

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

					<div style={styles.labelEditor}>
						<div style={styles.labelsEditing}>
							{labels.map((l) => {
								const c = labelColor(l);
								return (
									<span
										key={l}
										style={{
											...styles.labelChipEditing,
											background: c.bg,
											color: c.fg,
											border: `1px solid ${c.border}`,
										}}
									>
										{l}
										<button
											type="button"
											onClick={() => removeLabel(l)}
											style={styles.labelRemove}
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
									if (e.key === 'Enter' || e.key === ',') {
										e.preventDefault();
										addLabel();
									}
									if (e.key === 'Backspace' && !labelInput && labels.length > 0) {
										removeLabel(labels[labels.length - 1]);
									}
								}}
								onBlur={addLabel}
								placeholder={labels.length === 0 ? 'Add labels…' : '+'}
								style={styles.labelInput}
							/>
						</div>
					</div>

					<TodoList
						featureId={feature.id}
						todos={feature.todos}
						onChange={handleTodosChange}
					/>

					<div style={styles.footer}>
						<button
							type="button"
							onClick={toggleArchived}
							style={styles.archiveBtn}
						>
							{isArchived ? 'Unarchive' : 'Archive'}
						</button>
						<button
							type="button"
							onClick={() => {
								if (confirm(`Delete "${feature.title}"?`)) onDelete();
							}}
							style={styles.deleteBtn}
						>
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
	priorityBtn: {
		background: 'none',
		border: 'none',
		fontSize: '0.7rem',
		cursor: 'pointer',
		padding: '0.15rem 0.35rem',
		borderRadius: '4px',
		letterSpacing: '0.03em',
		fontFamily: 'Inter, sans-serif',
		minWidth: '1.8rem',
	},
	title: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.9rem',
		fontWeight: 500,
		fontFamily: 'Inter, sans-serif',
		padding: '0.15rem 0.25rem',
		minWidth: 0,
	},
	statusPill: {
		fontSize: '0.7rem',
		fontWeight: 600,
		padding: '0.2rem 0.55rem',
		borderRadius: '999px',
		cursor: 'pointer',
		fontFamily: 'Inter, sans-serif',
		whiteSpace: 'nowrap',
	},
	labelsRow: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.3rem',
		flexShrink: 0,
	},
	labelChip: {
		fontSize: '0.68rem',
		fontWeight: 500,
		padding: '0.12rem 0.45rem',
		borderRadius: '999px',
		whiteSpace: 'nowrap',
	},
	labelMore: {
		fontSize: '0.68rem',
		color: '#94a3b8',
		fontWeight: 500,
	},
	progressWrap: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		flexShrink: 0,
	},
	progressBar: {
		width: '80px',
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
		fontSize: '0.72rem',
		color: '#94a3b8',
		fontVariantNumeric: 'tabular-nums',
		minWidth: '2.2rem',
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
	labelEditor: {
		marginTop: '0.75rem',
	},
	labelsEditing: {
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: '0.35rem',
		padding: '0.35rem 0.5rem',
		border: '1px solid #e2e8f0',
		borderRadius: '4px',
		background: '#fff',
		minHeight: '2rem',
	},
	labelChipEditing: {
		fontSize: '0.72rem',
		fontWeight: 500,
		padding: '0.18rem 0.15rem 0.18rem 0.5rem',
		borderRadius: '999px',
		display: 'inline-flex',
		alignItems: 'center',
		gap: '0.15rem',
	},
	labelRemove: {
		background: 'none',
		border: 'none',
		color: 'inherit',
		opacity: 0.6,
		cursor: 'pointer',
		fontSize: '0.95rem',
		lineHeight: 1,
		padding: '0 0.25rem',
	},
	labelInput: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.8rem',
		fontFamily: 'Inter, sans-serif',
		minWidth: '100px',
		padding: '0.15rem 0.15rem',
	},
	footer: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: '0.75rem',
	},
	archiveBtn: {
		background: 'none',
		border: '1px solid #e2e8f0',
		color: '#475569',
		fontSize: '0.75rem',
		cursor: 'pointer',
		padding: '0.3rem 0.75rem',
		borderRadius: '4px',
		fontFamily: 'Inter, sans-serif',
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

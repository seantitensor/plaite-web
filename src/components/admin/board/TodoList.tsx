import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from './types';
import { nextOrder, sortByOrder } from './orderUtils';

interface Props {
	featureId: string;
	todos: Todo[];
	onChange: (todos: Todo[]) => void;
}

export default function TodoList({ featureId, todos, onChange }: Props) {
	const [newText, setNewText] = useState('');
	const sorted = sortByOrder(todos);
	const sortableIds = sorted.map((t) => `todo-${featureId}-${t.id}`);

	function toggle(id: string) {
		onChange(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
	}

	function updateText(id: string, text: string) {
		onChange(todos.map((t) => (t.id === id ? { ...t, text } : t)));
	}

	function remove(id: string) {
		onChange(todos.filter((t) => t.id !== id));
	}

	function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		const text = newText.trim();
		if (!text) return;
		const todo: Todo = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			text,
			done: false,
			order: nextOrder(sorted),
		};
		onChange([...todos, todo]);
		setNewText('');
	}

	return (
		<div style={styles.container}>
			<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
				{sorted.map((todo) => (
					<TodoItem
						key={todo.id}
						featureId={featureId}
						todo={todo}
						onToggle={() => toggle(todo.id)}
						onTextChange={(text) => updateText(todo.id, text)}
						onRemove={() => remove(todo.id)}
					/>
				))}
			</SortableContext>

			<form onSubmit={handleAdd} style={styles.addForm}>
				<input
					type="text"
					value={newText}
					onChange={(e) => setNewText(e.target.value)}
					placeholder="Add todo..."
					style={styles.addInput}
				/>
			</form>
		</div>
	);
}

interface ItemProps {
	featureId: string;
	todo: Todo;
	onToggle: () => void;
	onTextChange: (text: string) => void;
	onRemove: () => void;
}

function TodoItem({ featureId, todo, onToggle, onTextChange, onRemove }: ItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `todo-${featureId}-${todo.id}`,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		...styles.item,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<span
				{...attributes}
				{...listeners}
				style={styles.handle}
				title="Drag to reorder"
			>
				⋮⋮
			</span>
			<input
				type="checkbox"
				checked={todo.done}
				onChange={onToggle}
				style={styles.checkbox}
			/>
			<input
				type="text"
				value={todo.text}
				onChange={(e) => onTextChange(e.target.value)}
				style={{
					...styles.text,
					textDecoration: todo.done ? 'line-through' : 'none',
					color: todo.done ? '#94a3b8' : '#1e293b',
				}}
			/>
			<button type="button" onClick={onRemove} style={styles.removeBtn} title="Delete">
				×
			</button>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		marginTop: '0.75rem',
	},
	item: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		padding: '0.35rem 0.5rem',
		borderRadius: '4px',
	},
	handle: {
		cursor: 'grab',
		color: '#cbd5e1',
		fontSize: '0.9rem',
		userSelect: 'none',
		touchAction: 'none',
	},
	checkbox: {
		width: '16px',
		height: '16px',
		cursor: 'pointer',
		flexShrink: 0,
	},
	text: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.85rem',
		fontFamily: 'Inter, sans-serif',
		padding: '0.15rem 0.25rem',
	},
	removeBtn: {
		background: 'none',
		border: 'none',
		color: '#cbd5e1',
		fontSize: '1.1rem',
		lineHeight: 1,
		cursor: 'pointer',
		padding: '0 0.25rem',
	},
	addForm: {
		marginTop: '0.25rem',
		paddingLeft: '1.6rem',
	},
	addInput: {
		width: '100%',
		border: '1px dashed #cbd5e1',
		background: 'transparent',
		outline: 'none',
		fontSize: '0.8rem',
		padding: '0.35rem 0.5rem',
		borderRadius: '4px',
		fontFamily: 'Inter, sans-serif',
		color: '#64748b',
	},
};

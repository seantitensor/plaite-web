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
		<div className="mt-3">
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

			<form onSubmit={handleAdd} className="mt-1 pl-[1.6rem]">
				<input
					type="text"
					value={newText}
					onChange={(e) => setNewText(e.target.value)}
					placeholder="Add todo…"
					className="w-full border border-dashed border-hairline bg-transparent outline-none text-[12.5px] px-2 py-1.5 rounded font-sans text-muted placeholder:text-muted focus:border-accent focus:text-ink"
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
	};

	return (
		<div ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-1 rounded group hover:bg-mint-wash">
			<span
				{...attributes}
				{...listeners}
				className="cursor-grab text-whisper text-sm select-none"
				style={{ touchAction: 'none' }}
				title="Drag to reorder"
			>
				⋮⋮
			</span>
			<input
				type="checkbox"
				checked={todo.done}
				onChange={onToggle}
				className="w-[14px] h-[14px] cursor-pointer accent-forest flex-shrink-0"
			/>
			<input
				type="text"
				value={todo.text}
				onChange={(e) => onTextChange(e.target.value)}
				className={`flex-1 border-0 outline-none bg-transparent text-[13px] py-0.5 px-1 font-sans ${
					todo.done ? 'line-through text-muted' : 'text-ink'
				}`}
			/>
			<button
				type="button"
				onClick={onRemove}
				className="opacity-0 group-hover:opacity-100 bg-transparent border-0 text-whisper hover:text-alarm text-[16px] leading-none cursor-pointer px-1 transition-opacity"
				title="Delete"
			>
				×
			</button>
		</div>
	);
}

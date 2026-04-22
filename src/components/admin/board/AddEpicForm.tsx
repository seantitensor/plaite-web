import { useState } from 'react';

interface Props {
	onAdd: (name: string) => Promise<void> | void;
}

export default function AddEpicForm({ onAdd }: Props) {
	const [name, setName] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		setLoading(true);
		try {
			await onAdd(trimmed);
			setName('');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex items-center gap-2 px-4 py-3 bg-surface border border-dashed border-hairline rounded-lg mt-4 hover:border-muted transition-colors"
		>
			<span className="text-muted text-[15px] font-medium leading-none">+</span>
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="New epic (e.g. Current Features)"
				disabled={loading}
				className="flex-1 border-0 outline-none bg-transparent text-[14px] text-ink font-sans placeholder:text-muted"
			/>
		</form>
	);
}

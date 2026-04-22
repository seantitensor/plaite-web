import { useState } from 'react';

interface Props {
	epicId: string;
	onAdd: (epicId: string, title: string) => Promise<void> | void;
}

export default function AddFeatureForm({ epicId, onAdd }: Props) {
	const [title, setTitle] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed) return;
		setLoading(true);
		try {
			await onAdd(epicId, trimmed);
			setTitle('');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex items-center gap-2 px-3 py-2 bg-surface border border-dashed border-hairline rounded-md hover:border-muted transition-colors"
		>
			<span className="text-muted text-[13px] font-medium leading-none">+</span>
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Add feature…"
				disabled={loading}
				className="flex-1 border-0 outline-none bg-transparent text-[13.5px] text-ink font-sans placeholder:text-muted"
			/>
		</form>
	);
}

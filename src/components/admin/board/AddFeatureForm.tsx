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
		<form onSubmit={handleSubmit} style={styles.form}>
			<span style={styles.plus}>+</span>
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Add feature..."
				disabled={loading}
				style={styles.input}
			/>
		</form>
	);
}

const styles: Record<string, React.CSSProperties> = {
	form: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		padding: '0.5rem 0.75rem',
		background: '#fff',
		border: '1px dashed #e2e8f0',
		borderRadius: '8px',
	},
	plus: {
		color: '#cbd5e1',
		fontSize: '1rem',
		fontWeight: 600,
	},
	input: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.85rem',
		color: '#1e293b',
		fontFamily: 'Inter, sans-serif',
	},
};

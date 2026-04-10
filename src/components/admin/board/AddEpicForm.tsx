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
		<form onSubmit={handleSubmit} style={styles.form}>
			<span style={styles.plus}>+</span>
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="New epic (e.g. Current Features)"
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
		padding: '0.75rem 1rem',
		background: '#fff',
		border: '1px dashed #cbd5e1',
		borderRadius: '8px',
		marginTop: '1rem',
	},
	plus: {
		color: '#94a3b8',
		fontSize: '1.1rem',
		fontWeight: 600,
	},
	input: {
		flex: 1,
		border: 'none',
		outline: 'none',
		background: 'transparent',
		fontSize: '0.9rem',
		color: '#1e293b',
		fontFamily: 'Inter, sans-serif',
	},
};

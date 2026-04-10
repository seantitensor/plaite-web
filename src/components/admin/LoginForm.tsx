import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';

export default function LoginForm() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const result = await signInWithEmailAndPassword(auth, email, password);
			const idToken = await result.user.getIdToken();

			const res = await fetch('/api/admin/auth/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Login failed');
				setLoading(false);
				return;
			}

			window.location.href = '/admin';
		} catch (err: any) {
			setError(err.message || 'Login failed');
			setLoading(false);
		}
	}

	return (
		<div style={styles.container}>
			<div style={styles.card}>
				<h1 style={styles.logo}>plaite</h1>
				<h2 style={styles.title}>Admin Login</h2>

				{error && <div style={styles.error}>{error}</div>}

				<form onSubmit={handleSubmit} style={styles.form}>
					<div style={styles.field}>
						<label style={styles.label}>Email</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							style={styles.input}
							placeholder="admin@plaite.io"
						/>
					</div>
					<div style={styles.field}>
						<label style={styles.label}>Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							style={styles.input}
							placeholder="Enter password"
						/>
					</div>
					<button type="submit" disabled={loading} style={styles.button}>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		minHeight: '100vh',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		background: '#f1f5f9',
		fontFamily: "'Montserrat', sans-serif",
	},
	card: {
		background: '#fff',
		borderRadius: '16px',
		padding: '3rem',
		width: '100%',
		maxWidth: '400px',
		boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
	},
	logo: {
		fontSize: '2rem',
		fontWeight: 700,
		color: '#4A9B6B',
		textAlign: 'center',
		marginBottom: '0.5rem',
	},
	title: {
		fontSize: '1.1rem',
		fontWeight: 500,
		color: '#64748b',
		textAlign: 'center',
		marginBottom: '2rem',
	},
	error: {
		background: '#fef2f2',
		color: '#dc2626',
		padding: '0.75rem 1rem',
		borderRadius: '8px',
		fontSize: '0.9rem',
		marginBottom: '1rem',
	},
	form: {
		display: 'flex',
		flexDirection: 'column',
		gap: '1.25rem',
	},
	field: {
		display: 'flex',
		flexDirection: 'column',
		gap: '0.4rem',
	},
	label: {
		fontSize: '0.85rem',
		fontWeight: 600,
		color: '#374151',
	},
	input: {
		padding: '0.75rem 1rem',
		border: '1px solid #e2e8f0',
		borderRadius: '8px',
		fontSize: '1rem',
		outline: 'none',
		fontFamily: "'Montserrat', sans-serif",
	},
	button: {
		padding: '0.85rem',
		background: 'linear-gradient(135deg, rgba(74,155,107,0.8), #4A9B6B)',
		color: '#fff',
		border: 'none',
		borderRadius: '50px',
		fontSize: '1rem',
		fontWeight: 600,
		cursor: 'pointer',
		fontFamily: "'Montserrat', sans-serif",
		marginTop: '0.5rem',
	},
};

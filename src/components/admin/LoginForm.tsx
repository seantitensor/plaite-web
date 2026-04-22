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
		<div className="min-h-screen flex items-center justify-center px-6">
			<div className="w-full max-w-[380px]">
				<div className="text-center mb-10">
					<div className="flex items-baseline justify-center gap-2 mb-1">
						<span className="italic text-[44px] font-semibold tracking-[-0.02em] leading-none text-forest">plaite</span>
						<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">admin</span>
					</div>
					<p className="font-semibold text-[11px] uppercase tracking-[0.14em] text-ink/70 mt-3">Sign in to continue</p>
				</div>

				<div className="bg-surface border border-hairline rounded-lg p-8">
					{error && (
						<div className="mb-5 bg-alarm-wash border border-alarm/25 text-alarm text-[13px] rounded-md px-3 py-2.5">
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="email" className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">
								Email
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								className="px-3 py-2.5 bg-canvas border border-hairline rounded-md text-[14px] text-ink outline-none focus:border-accent focus:bg-surface transition-colors"
								placeholder="admin@plaite.io"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="password" className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								className="px-3 py-2.5 bg-canvas border border-hairline rounded-md text-[14px] text-ink outline-none focus:border-accent focus:bg-surface transition-colors"
							/>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="mt-2 px-5 py-2.5 bg-accent text-surface rounded-md text-[14px] font-medium hover:bg-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{loading ? 'Signing in…' : 'Sign in'}
						</button>
					</form>
				</div>

				<p className="mt-6 text-center font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">
					Authorized personnel only.
				</p>
			</div>
		</div>
	);
}

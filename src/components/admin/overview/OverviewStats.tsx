import { useEffect, useState } from 'react';

interface Overview {
	daily: any[];
	totals: { activeUsers?: number };
}
interface Crashes {
	totals: { rate: number; crashes: number; sessions: number };
}
interface MessagesResp {
	messages: Array<{ responded?: boolean }>;
}

export default function OverviewStats() {
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState<Overview | null>(null);
	const [crashes, setCrashes] = useState<Crashes | null>(null);
	const [unresponded, setUnresponded] = useState<number | null>(null);
	const [liveUsers, setLiveUsers] = useState<number | null>(null);
	const [liveError, setLiveError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [ovRes, crRes, msgRes] = await Promise.allSettled([
				fetch('/api/admin/analytics/overview?startDate=30daysAgo&endDate=today').then((r) => r.json()),
				fetch('/api/admin/analytics/crashes?startDate=7daysAgo&endDate=today').then((r) => r.json()),
				fetch('/api/admin/messages').then((r) => r.json()),
			]);
			if (cancelled) return;
			if (ovRes.status === 'fulfilled' && !ovRes.value.error) setOverview(ovRes.value);
			if (crRes.status === 'fulfilled' && !crRes.value.error) setCrashes(crRes.value);
			if (msgRes.status === 'fulfilled' && !msgRes.value.error) {
				const list = (msgRes.value as MessagesResp).messages || [];
				setUnresponded(list.filter((m) => !m.responded).length);
			}
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		async function tick() {
			try {
				const res = await fetch('/api/admin/analytics/realtime');
				if (!res.ok) throw new Error('bad status');
				const body = await res.json();
				if (!cancelled) {
					setLiveUsers(body.users ?? 0);
					setLiveError(false);
				}
			} catch {
				if (!cancelled) setLiveError(true);
			}
		}
		tick();
		const id = setInterval(tick, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	const dau = overview?.daily?.[overview.daily.length - 1]?.dau;
	const active30d = overview?.totals?.activeUsers;
	const crashRate = crashes?.totals?.rate;
	const crashRateHigh = typeof crashRate === 'number' && crashRate > 0.01;
	const unrespondedHigh = typeof unresponded === 'number' && unresponded > 0;

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
			{/* Live users */}
			<Card>
				<div className="flex items-center justify-between">
					<Label>Live users</Label>
					<span className="relative flex h-2 w-2">
						<span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-live"></span>
						<span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
					</span>
				</div>
				<Value>
					{liveError ? '—' : liveUsers === null ? '…' : liveUsers.toLocaleString()}
				</Value>
				<Sub>right now</Sub>
			</Card>

			{/* DAU */}
			<Card>
				<Label>DAU today</Label>
				<Value>{loading ? '…' : typeof dau === 'number' ? dau.toLocaleString() : '—'}</Value>
				<Sub>1-day active users</Sub>
			</Card>

			{/* 30d */}
			<Card>
				<Label>30-day active</Label>
				<Value>{loading ? '…' : typeof active30d === 'number' ? active30d.toLocaleString() : '—'}</Value>
				<Sub>unique users</Sub>
			</Card>

			{/* Crash rate */}
			<Card tone={crashRateHigh ? 'alarm' : 'default'}>
				<Label tone={crashRateHigh ? 'alarm' : 'default'}>Crash rate · 7d</Label>
				<Value tone={crashRateHigh ? 'alarm' : 'default'}>
					{loading
						? '…'
						: typeof crashRate === 'number'
							? <>{Math.round(crashRate * 100)}<span className="font-mono text-[18px] text-muted ml-0.5 font-normal">%</span></>
							: '—'}
				</Value>
				<Sub>
					{crashes
						? `${crashes.totals.crashes.toLocaleString()} of ${crashes.totals.sessions.toLocaleString()} sessions`
						: ''}
				</Sub>
			</Card>

			{/* Unresponded */}
			<Card tone={unrespondedHigh ? 'alarm' : 'default'}>
				<Label tone={unrespondedHigh ? 'alarm' : 'default'}>Unresponded</Label>
				<Value tone={unrespondedHigh ? 'alarm' : 'default'}>
					{loading ? '…' : unresponded === null ? '—' : unresponded.toLocaleString()}
				</Value>
				<Sub>
					<a href="/admin/messages" className={`${unrespondedHigh ? 'text-alarm' : 'text-forest'} hover:underline no-underline`}>
						{unrespondedHigh ? 'Open messages →' : 'All caught up'}
					</a>
				</Sub>
			</Card>
		</div>
	);
}

function Card({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'alarm' }) {
	return (
		<div className={`bg-surface border rounded-lg p-5 ${tone === 'alarm' ? 'border-alarm/40' : 'border-hairline'}`}>
			{children}
		</div>
	);
}

function Label({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'alarm' }) {
	return (
		<span className={`font-semibold text-[11px] uppercase tracking-[0.1em] ${tone === 'alarm' ? 'text-alarm' : 'text-ink/70'}`}>
			{children}
		</span>
	);
}

function Value({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'alarm' }) {
	return (
		<div className={`text-[38px] font-medium tracking-[-0.02em] leading-none mt-3 tabular-nums ${tone === 'alarm' ? 'text-alarm' : 'text-ink'}`}>
			{children}
		</div>
	);
}

function Sub({ children }: { children: React.ReactNode }) {
	return <div className="font-mono text-[11px] text-muted mt-2">{children}</div>;
}

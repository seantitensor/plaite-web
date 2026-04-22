interface Version { version: string; sessions: number; users: number }
interface Props { versions: Version[]; title?: string }

export default function VersionsTable({ versions, title = 'App versions' }: Props) {
	const max = versions.reduce((m, v) => Math.max(m, v.sessions), 0) || 1;
	return (
		<div className="bg-surface border border-hairline rounded-lg p-6 overflow-auto">
			<h3 className="italic text-[20px] font-normal tracking-[-0.01em] text-ink mb-4">{title}</h3>
			{versions.length === 0 ? (
				<p className="font-mono text-[12px] text-muted">No version data.</p>
			) : (
				<table className="w-full border-collapse text-[13px]">
					<thead>
						<tr>
							<th className="text-left font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Version</th>
							<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Sessions</th>
							<th className="text-right font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70 pb-2 border-b border-hairline">Users</th>
						</tr>
					</thead>
					<tbody>
						{versions.map((v, i) => (
							<tr key={v.version} className={i % 2 === 1 ? 'bg-canvas' : ''}>
								<td className="py-2 px-2 border-b border-hairline/60">
									<div className="flex flex-col gap-1 min-w-0">
										<code className="font-mono text-[12px] bg-canvas text-ink px-1.5 py-0.5 rounded self-start max-w-full truncate">{v.version || '(unknown)'}</code>
										<div className="w-full h-[3px] bg-hairline rounded-full overflow-hidden">
											<div className="h-full bg-accent" style={{ width: `${(v.sessions / max) * 100}%` }} />
										</div>
									</div>
								</td>
								<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-ink tabular-nums">{v.sessions.toLocaleString()}</td>
								<td className="py-2 px-2 border-b border-hairline/60 text-right font-mono text-[12px] text-muted tabular-nums">{v.users.toLocaleString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

interface Props {
	title: string;
	value: number | string;
	icon?: string; // retained for API compat but no longer rendered
}

export default function MetricCard({ title, value }: Props) {
	const formatted = typeof value === 'number' ? value.toLocaleString() : value;
	return (
		<div className="bg-surface border border-hairline rounded-lg p-5">
			<div className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">{title}</div>
			<div className="text-[38px] font-medium tracking-[-0.02em] leading-none text-ink mt-3 tabular-nums">{formatted}</div>
		</div>
	);
}

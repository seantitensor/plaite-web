interface Props {
	value: string;
	onChange: (range: string) => void;
}

const ranges = [
	{ label: '7 days', value: '7daysAgo' },
	{ label: '30 days', value: '30daysAgo' },
	{ label: '90 days', value: '90daysAgo' },
];

export default function DateRangePicker({ value, onChange }: Props) {
	return (
		<div className="inline-flex bg-surface border border-hairline rounded-md overflow-hidden">
			{ranges.map((r, i) => (
				<button
					key={r.value}
					type="button"
					onClick={() => onChange(r.value)}
					className={`px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
						value === r.value ? 'bg-accent text-surface' : 'text-muted hover:text-ink hover:bg-mint-wash'
					} ${i !== 0 ? 'border-l border-hairline' : ''}`}
				>
					{r.label}
				</button>
			))}
		</div>
	);
}

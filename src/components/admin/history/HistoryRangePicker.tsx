export interface HistoryRange {
	label: string;
	startDate: string;
	endDate: string;
}

interface Props {
	value: string;
	onChange: (range: HistoryRange) => void;
}

export const HISTORY_PRESETS: HistoryRange[] = [
	{ label: '30d', startDate: '30daysAgo', endDate: 'today' },
	{ label: '90d', startDate: '90daysAgo', endDate: 'today' },
	{ label: '1y', startDate: '365daysAgo', endDate: 'today' },
	{ label: 'All time', startDate: '2020-03-31', endDate: 'today' },
];

export default function HistoryRangePicker({ value, onChange }: Props) {
	return (
		<div className="inline-flex bg-surface border border-hairline rounded-md overflow-hidden">
			{HISTORY_PRESETS.map((r, i) => (
				<button
					key={r.label}
					type="button"
					onClick={() => onChange(r)}
					className={`px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
						value === r.label ? 'bg-accent text-surface' : 'text-muted hover:text-ink hover:bg-mint-wash'
					} ${i !== 0 ? 'border-l border-hairline' : ''}`}
				>
					{r.label}
				</button>
			))}
		</div>
	);
}

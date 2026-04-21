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
		<div style={{ display: 'flex', gap: '0.5rem' }}>
			{HISTORY_PRESETS.map((r) => (
				<button
					key={r.label}
					onClick={() => onChange(r)}
					style={{
						padding: '0.4rem 1rem',
						borderRadius: '6px',
						border: 'none',
						background: value === r.label ? '#4A9B6B' : '#e2e8f0',
						color: value === r.label ? '#fff' : '#475569',
						fontWeight: 600,
						fontSize: '0.8rem',
						cursor: 'pointer',
						fontFamily: 'Inter, sans-serif',
					}}
				>
					{r.label}
				</button>
			))}
		</div>
	);
}

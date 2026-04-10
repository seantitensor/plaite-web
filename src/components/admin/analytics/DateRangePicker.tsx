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
		<div style={{ display: 'flex', gap: '0.5rem' }}>
			{ranges.map((r) => (
				<button
					key={r.value}
					onClick={() => onChange(r.value)}
					style={{
						padding: '0.4rem 1rem',
						borderRadius: '6px',
						border: 'none',
						background: value === r.value ? '#4A9B6B' : '#e2e8f0',
						color: value === r.value ? '#fff' : '#475569',
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

interface Props {
	title: string;
	numerator: number;
	denominator: number;
	icon?: string;
	tone?: 'neutral' | 'bad';
	numeratorLabel?: string;
	denominatorLabel?: string;
}

export default function PercentCard({
	title,
	numerator,
	denominator,
	tone = 'neutral',
	numeratorLabel,
	denominatorLabel,
}: Props) {
	const rate = denominator > 0 ? numerator / denominator : 0;
	const pct = (rate * 100).toFixed(1);
	const alarm = tone === 'bad' && rate > 0;

	return (
		<div className={`bg-surface border rounded-lg p-5 ${alarm ? 'border-alarm/40' : 'border-hairline'}`}>
			<div className={`font-semibold text-[11px] uppercase tracking-[0.1em] ${alarm ? 'text-alarm' : 'text-ink/70'}`}>{title}</div>
			<div className={`text-[38px] font-medium tracking-[-0.02em] leading-none mt-3 tabular-nums ${alarm ? 'text-alarm' : 'text-ink'}`}>
				{pct}<span className="font-mono text-[18px] text-muted ml-0.5 font-normal">%</span>
			</div>
			<div className="font-mono text-[11px] text-muted mt-2">
				{numerator.toLocaleString()} {numeratorLabel || ''} of {denominator.toLocaleString()} {denominatorLabel || ''}
			</div>
		</div>
	);
}

interface Props {
	dau: number;
	mau: number;
}

export default function StickinessCard({ dau, mau }: Props) {
	const ratio = mau > 0 ? dau / mau : 0;
	const pct = `${Math.round(ratio * 100)}`;

	return (
		<div className="bg-surface border border-hairline rounded-lg p-5">
			<div className="font-semibold text-[11px] uppercase tracking-[0.1em] text-ink/70">Stickiness</div>
			<div className="text-[38px] font-medium tracking-[-0.02em] leading-none text-ink mt-3 tabular-nums">
				{pct}<span className="font-mono text-[18px] text-muted ml-0.5 font-normal">%</span>
			</div>
			<div className="font-mono text-[11px] text-muted mt-2">
				DAU / MAU · {dau.toLocaleString()} of {mau.toLocaleString()}
			</div>
		</div>
	);
}

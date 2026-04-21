import HistoryLineChart, { type Granularity } from './HistoryLineChart';

interface UserBucket {
	bucket: string;
	newUsers: number;
}

interface Props {
	userBuckets: UserBucket[];
	granularity: Granularity;
}

export default function CumulativeUsersChart({ userBuckets, granularity }: Props) {
	let running = 0;
	const data = userBuckets.map((b) => {
		running += b.newUsers || 0;
		return { bucket: b.bucket, value: running };
	});

	return (
		<HistoryLineChart
			title="Cumulative Users (approx.)"
			data={data}
			granularity={granularity}
			color="#3b82f6"
			footnote="GA4 counts a user as new on their first session. Users who clear app data or reinstall on a new device are counted again."
		/>
	);
}

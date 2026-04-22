export interface Todo {
	id: string;
	text: string;
	done: boolean;
	order: number;
}

export type FeatureStatus = 'not_started' | 'in_progress' | 'done';
export type FeaturePriority = 'p0' | 'p1' | 'p2';

export interface Feature {
	id: string;
	boardId: string;
	epicId: string;
	title: string;
	description: string;
	order: number;
	todos: Todo[];
	status?: FeatureStatus;
	priority?: FeaturePriority;
	labels?: string[];
	archived?: boolean;
}

export interface Epic {
	id: string;
	boardId: string;
	name: string;
	order: number;
}

export const STATUS_LABELS: Record<FeatureStatus, string> = {
	not_started: 'Not started',
	in_progress: 'In progress',
	done: 'Done',
};

export const STATUS_COLORS: Record<FeatureStatus, { bg: string; fg: string; border: string }> = {
	not_started: { bg: '#f1f5f9', fg: '#475569', border: '#e2e8f0' },
	in_progress: { bg: 'rgba(59, 130, 246, 0.1)', fg: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' },
	done: { bg: 'rgba(74, 155, 107, 0.12)', fg: '#2f6b4a', border: 'rgba(74, 155, 107, 0.3)' },
};

export const PRIORITY_LABELS: Record<FeaturePriority, string> = {
	p0: 'P0',
	p1: 'P1',
	p2: 'P2',
};

export const PRIORITY_COLORS: Record<FeaturePriority, string> = {
	p0: '#dc2626',
	p1: '#d97706',
	p2: '#94a3b8',
};

export function cycleStatus(s: FeatureStatus | undefined): FeatureStatus {
	const cur = s ?? 'not_started';
	if (cur === 'not_started') return 'in_progress';
	if (cur === 'in_progress') return 'done';
	return 'not_started';
}

export function cyclePriority(p: FeaturePriority | undefined): FeaturePriority {
	// P2 → P1 → P0 → P2 (upcycle toward urgent, wrap to low)
	const cur = p ?? 'p2';
	if (cur === 'p2') return 'p1';
	if (cur === 'p1') return 'p0';
	return 'p2';
}

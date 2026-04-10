/**
 * Compute a fractional order value for inserting an item into a sorted list.
 *
 * - `siblings` must be sorted ascending by `order` and should NOT include the
 *   item being moved.
 * - `targetIndex` is the index where the item should land (0 = top,
 *   siblings.length = bottom).
 *
 * Returns a number that sorts into the correct slot without renumbering.
 */
export function computeOrder(
	siblings: Array<{ order: number }>,
	targetIndex: number,
): number {
	if (siblings.length === 0) return 1000;
	if (targetIndex <= 0) return siblings[0].order - 500;
	if (targetIndex >= siblings.length) {
		return siblings[siblings.length - 1].order + 500;
	}
	return (siblings[targetIndex - 1].order + siblings[targetIndex].order) / 2;
}

/** Append a new item to the end of a sorted list. */
export function nextOrder(siblings: Array<{ order: number }>): number {
	if (siblings.length === 0) return 1000;
	return siblings[siblings.length - 1].order + 1000;
}

/** Sort a list by `order` ascending (non-mutating). */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
	return [...items].sort((a, b) => a.order - b.order);
}

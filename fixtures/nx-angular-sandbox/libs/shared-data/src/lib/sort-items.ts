export interface SortableItem {
  id: string;
  name: string;
  priority: number;
}

/**
 * Sort by priority descending; break ties by id ascending.
 */
export function sortByPriority(items: SortableItem[]): SortableItem[] {
  return [...items].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
}

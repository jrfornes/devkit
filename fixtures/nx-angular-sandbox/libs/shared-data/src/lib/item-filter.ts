export interface CatalogItem {
  id: string;
  name: string;
  /** When omitted, the item is treated as active unless explicitly false. */
  active?: boolean;
}

/**
 * Returns catalog items that should appear in the active listing.
 * Items without an explicit `active: false` are considered active.
 */
export function filterActiveItems(items: CatalogItem[]): CatalogItem[] {
  return items.filter((item) => item.active !== false);
}

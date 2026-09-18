export interface PricedItem {
  price: number;
}

/**
 * Sum item prices. Used by catalog pricing smoke tests.
 */
export function calculateTotal(items: PricedItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

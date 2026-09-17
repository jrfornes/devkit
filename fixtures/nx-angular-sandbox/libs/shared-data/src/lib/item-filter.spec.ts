import { filterActiveItems, CatalogItem } from './item-filter';

describe('filterActiveItems', () => {
  const items: CatalogItem[] = [
    { id: '1', name: 'Widget', active: true },
    { id: '2', name: 'Gadget', active: false },
    { id: '3', name: 'Doohickey' },
    { id: '4', name: 'Gizmo', active: true },
  ];

  it('includes explicitly active items and items with no active flag', () => {
    const result = filterActiveItems(items);

    expect(result.map((item) => item.id)).toEqual(['1', '3', '4']);
  });

  it('excludes items explicitly marked inactive', () => {
    const result = filterActiveItems(items);

    expect(result.find((item) => item.id === '2')).toBeUndefined();
  });
});

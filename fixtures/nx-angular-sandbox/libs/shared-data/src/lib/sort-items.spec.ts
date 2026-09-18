import { sortByPriority } from './sort-items';

describe('sortByPriority', () => {
  const items = [
    { id: 'b', name: 'Bravo', priority: 2 },
    { id: 'a', name: 'Alpha', priority: 2 },
    { id: 'c', name: 'Charlie', priority: 1 },
    { id: 'd', name: 'Delta', priority: 3 },
  ];

  it('orders items by priority descending', () => {
    const result = sortByPriority(items);
    expect(result.map((item) => item.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('breaks priority ties by id ascending', () => {
    const tied = [
      { id: 'z', name: 'Zulu', priority: 5 },
      { id: 'm', name: 'Mike', priority: 5 },
      { id: 'a', name: 'Alpha', priority: 5 },
    ];
    const result = sortByPriority(tied);
    expect(result.map((item) => item.id)).toEqual(['a', 'm', 'z']);
  });
});

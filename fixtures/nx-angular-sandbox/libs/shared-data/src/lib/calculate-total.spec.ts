import { calculateTotal } from './calculate-total';

describe('calculateTotal', () => {
  it('sums item prices', () => {
    const total = calculateTotal([{ price: 10 }, { price: 25 }, { price: 5 }]);
    expect(total).toBe(40);
  });

  it('returns zero for an empty list', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

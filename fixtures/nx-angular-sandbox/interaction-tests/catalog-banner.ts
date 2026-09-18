export default {
  route: '/',
  actions: [
    { type: 'click', selector: '[data-testid="refresh-count"]' },
    { type: 'wait', ms: 200 },
  ],
  assertions: [{ type: 'textContent', selector: '.subtitle', expected: '4 items available' }],
};

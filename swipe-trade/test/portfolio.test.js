const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../portfolio.js');

test('buy debits cash and averages cost', () => {
  let p = P.createPortfolio(1000);
  p = P.buy(p, 'AAPL', 2, 100).portfolio;
  p = P.buy(p, 'AAPL', 2, 200).portfolio;
  assert.equal(p.cash, 400);
  assert.deepEqual(p.positions.AAPL, { qty: 4, avgCost: 150 });
});

test('buy rejects when cash is short and leaves portfolio untouched', () => {
  const p = P.createPortfolio(50);
  const r = P.buy(p, 'AAPL', 1, 100);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Not enough cash');
  assert.equal(p.cash, 50);
});

test('sell credits cash, caps at held quantity and clears empty positions', () => {
  let p = P.buy(P.createPortfolio(1000), 'TSLA', 3, 100).portfolio;
  const r = P.sell(p, 'TSLA', 5, 120);
  assert.equal(r.ok, true);
  assert.equal(r.trade.qty, 3);
  assert.equal(r.portfolio.cash, 1060);
  assert.equal(r.portfolio.positions.TSLA, undefined);
});

test('sell without a position is rejected', () => {
  const r = P.sell(P.createPortfolio(1000), 'NVDA', 1, 100);
  assert.equal(r.ok, false);
});

test('original portfolio is never mutated (undo relies on this)', () => {
  const p = P.buy(P.createPortfolio(1000), 'MSFT', 1, 100).portfolio;
  const snapshot = JSON.stringify(p);
  P.buy(p, 'MSFT', 1, 100);
  P.sell(p, 'MSFT', 1, 100);
  assert.equal(JSON.stringify(p), snapshot);
});

test('marketValue uses live prices', () => {
  let p = P.buy(P.createPortfolio(1000), 'A', 2, 100).portfolio;
  assert.equal(P.marketValue(p, { A: 150 }), 300);
});

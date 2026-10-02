/*
 * Pure portfolio logic: no DOM, no timers. Every function returns a new
 * portfolio object so the UI can keep the previous one around for undo.
 */
(function (root) {
  'use strict';

  const round2 = (n) => Math.round(n * 100) / 100;

  function createPortfolio(cash) {
    return { cash: round2(cash), positions: {} };
  }

  function holding(portfolio, symbol) {
    const pos = portfolio.positions[symbol];
    return pos ? pos.qty : 0;
  }

  function buy(portfolio, symbol, qty, price) {
    if (!(qty > 0) || !(price > 0)) return { ok: false, reason: 'Invalid order' };
    const cost = round2(qty * price);
    if (cost > portfolio.cash + 1e-9) {
      return { ok: false, reason: 'Not enough cash' };
    }
    const prev = portfolio.positions[symbol] || { qty: 0, avgCost: 0 };
    const newQty = prev.qty + qty;
    const avgCost = (prev.qty * prev.avgCost + qty * price) / newQty;
    return {
      ok: true,
      portfolio: {
        cash: round2(portfolio.cash - cost),
        positions: { ...portfolio.positions, [symbol]: { qty: newQty, avgCost } },
      },
      trade: { side: 'buy', symbol, qty, price, total: cost },
    };
  }

  function sell(portfolio, symbol, qty, price) {
    if (!(qty > 0) || !(price > 0)) return { ok: false, reason: 'Invalid order' };
    const prev = portfolio.positions[symbol];
    if (!prev || prev.qty <= 0) return { ok: false, reason: `You don't own ${symbol}` };
    // Sell what you have if the trade size is larger than the position.
    const fillQty = Math.min(qty, prev.qty);
    const proceeds = round2(fillQty * price);
    const positions = { ...portfolio.positions };
    const remaining = prev.qty - fillQty;
    if (remaining > 0) positions[symbol] = { qty: remaining, avgCost: prev.avgCost };
    else delete positions[symbol];
    return {
      ok: true,
      portfolio: { cash: round2(portfolio.cash + proceeds), positions },
      trade: { side: 'sell', symbol, qty: fillQty, price, total: proceeds },
    };
  }

  function marketValue(portfolio, prices) {
    let total = 0;
    for (const [symbol, pos] of Object.entries(portfolio.positions)) {
      total += pos.qty * (prices[symbol] ?? pos.avgCost);
    }
    return total;
  }

  const api = { createPortfolio, holding, buy, sell, marketValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Portfolio = api;
})(typeof window !== 'undefined' ? window : globalThis);

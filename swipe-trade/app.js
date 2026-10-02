(function () {
  'use strict';

  const STARTING_CASH = 10000;
  const STORAGE_KEY = 'swipe-trade:v1';
  const HISTORY_LEN = 40;
  const TICK_MS = 1500;

  const STOCKS = [
    { symbol: 'AAPL', name: 'Apple', price: 228.4, vol: 0.0016 },
    { symbol: 'NVDA', name: 'NVIDIA', price: 121.9, vol: 0.0032 },
    { symbol: 'MSFT', name: 'Microsoft', price: 417.1, vol: 0.0014 },
    { symbol: 'TSLA', name: 'Tesla', price: 249.8, vol: 0.0038 },
    { symbol: 'AMZN', name: 'Amazon', price: 186.3, vol: 0.002 },
    { symbol: 'GOOGL', name: 'Alphabet', price: 165.7, vol: 0.0018 },
    { symbol: 'META', name: 'Meta Platforms', price: 572.4, vol: 0.0024 },
    { symbol: 'NFLX', name: 'Netflix', price: 705.2, vol: 0.0022 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', price: 162.1, vol: 0.003 },
    { symbol: 'COIN', name: 'Coinbase', price: 178.6, vol: 0.0045 },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 525.3, vol: 0.0008 },
    { symbol: 'KO', name: 'Coca-Cola', price: 71.2, vol: 0.0008 },
  ];

  const P = window.Portfolio;
  const $ = (sel) => document.querySelector(sel);
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const pct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
  const signed = (n) => `${n >= 0 ? '+' : '−'}${usd.format(Math.abs(n))}`;
  const vibrate = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

  // ---------- State ----------
  const market = {};
  for (const s of STOCKS) {
    const history = [];
    let p = s.price * (1 + (Math.random() - 0.5) * 0.03);
    for (let i = 0; i < HISTORY_LEN; i++) {
      history.push(p);
      p += (s.price - p) * 0.08 + p * s.vol * gauss() * 2;
    }
    market[s.symbol] = { ...s, open: history[0], price: round2(history[HISTORY_LEN - 1]), history };
  }

  const saved = load();
  let portfolio = saved.portfolio || P.createPortfolio(STARTING_CASH);
  let qty = saved.qty || 5;
  let onboarded = !!saved.onboarded;
  let tab = 'watch';
  let lastTrade = null; // { before, trade } — only the latest trade is undoable

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ portfolio, qty, onboarded })); } catch (_) {}
  }
  function gauss() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function prices() {
    const out = {};
    for (const s in market) out[s] = market[s].price;
    return out;
  }

  // ---------- Rendering ----------
  const list = $('#list');
  const rows = new Map(); // symbol -> row element

  function visibleSymbols() {
    if (tab === 'watch') return STOCKS.map((s) => s.symbol);
    return STOCKS.map((s) => s.symbol).filter((s) => P.holding(portfolio, s) > 0);
  }

  function renderList() {
    rows.clear();
    list.textContent = '';
    for (const symbol of visibleSymbols()) {
      const row = document.createElement('li');
      row.className = 'row';
      row.dataset.symbol = symbol;
      row.innerHTML = `
        <div class="action action-buy" aria-hidden="true"><span class="label"><span class="a-title"></span><small class="a-sub"></small></span></div>
        <div class="action action-sell" aria-hidden="true"><span class="label"><span class="a-title"></span><small class="a-sub"></small></span></div>
        <div class="card" tabindex="0" role="button" aria-expanded="false">
          <div class="id">
            <div class="sym">${symbol}<span class="badge" hidden></span></div>
            <div class="name"></div>
          </div>
          <svg class="spark" viewBox="0 0 64 28" aria-hidden="true"><path class="base"/><path class="line"/></svg>
          <div class="quote">
            <div class="price"></div>
            <div class="chg"></div>
          </div>
        </div>
        <div class="detail">
          <p class="pos"></p>
          <button class="do-buy" type="button"></button>
          <button class="do-sell" type="button"></button>
        </div>`;
      rows.set(symbol, row);
      list.appendChild(row);
      updateRow(row, null);
    }
    $('#empty').hidden = rows.size > 0;
    if (!onboarded && tab === 'watch' && list.firstElementChild) {
      list.firstElementChild.classList.add('nudge');
    }
  }

  function updateRow(row, direction) {
    const symbol = row.dataset.symbol;
    const m = market[symbol];
    const held = P.holding(portfolio, symbol);
    const pos = portfolio.positions[symbol];
    const change = m.price / m.open - 1;

    const priceEl = row.querySelector('.price');
    priceEl.textContent = usd.format(m.price);
    if (direction) {
      priceEl.classList.remove('tick-up', 'tick-down');
      void priceEl.offsetWidth; // restart the flash animation
      priceEl.classList.add(direction > 0 ? 'tick-up' : 'tick-down');
    }
    const chg = row.querySelector('.chg');
    chg.textContent = pct(change);
    chg.className = `chg ${change >= 0 ? 'up' : 'down'}`;

    const badge = row.querySelector('.badge');
    badge.hidden = held === 0;
    badge.textContent = `${held} sh`;

    const name = row.querySelector('.name');
    if (tab === 'owned' && pos) {
      const pnl = (m.price - pos.avgCost) * pos.qty;
      name.textContent = `${usd.format(pos.qty * m.price)} · ${signed(pnl)}`;
      name.className = `name ${pnl >= 0 ? 'up' : 'down'}`;
    } else {
      name.textContent = m.name;
      name.className = 'name';
    }

    drawSpark(row.querySelector('.spark'), m, change >= 0);
    updateActions(row);
  }

  function drawSpark(svg, m, up) {
    const h = m.history;
    const lo = Math.min(m.open, ...h);
    const hi = Math.max(m.open, ...h);
    const span = hi - lo || 1;
    const y = (v) => (26 - ((v - lo) / span) * 24).toFixed(1);
    const d = h.map((v, i) => `${i ? 'L' : 'M'}${((i / (h.length - 1)) * 64).toFixed(1)} ${y(v)}`).join('');
    const line = svg.querySelector('.line');
    line.setAttribute('d', d);
    line.style.stroke = up ? 'var(--up)' : 'var(--down)';
    svg.querySelector('.base').setAttribute('d', `M0 ${y(m.open)}H64`);
  }

  // What a swipe would do right now, including why it can't.
  function quoteOrder(symbol, side) {
    const m = market[symbol];
    if (side === 'buy') {
      const total = qty * m.price;
      return total > portfolio.cash
        ? { blocked: 'Not enough cash', qty, total }
        : { qty, total };
    }
    const held = P.holding(portfolio, symbol);
    if (held === 0) return { blocked: 'None to sell', qty: 0, total: 0 };
    const fill = Math.min(qty, held);
    return { qty: fill, total: fill * m.price };
  }

  function updateActions(row) {
    const symbol = row.dataset.symbol;
    for (const side of ['buy', 'sell']) {
      const q = quoteOrder(symbol, side);
      const verb = side === 'buy' ? 'Buy' : 'Sell';
      const action = row.querySelector(`.action-${side}`);
      action.querySelector('.a-title').textContent = q.blocked || `${verb} ${q.qty}`;
      action.querySelector('.a-sub').textContent = q.blocked ? '' : `≈ ${usd.format(q.total)}`;
      const btn = row.querySelector(`.do-${side}`);
      btn.textContent = q.blocked || `${verb} ${q.qty} · ${usd.format(q.total)}`;
      btn.disabled = !!q.blocked;
    }
    const pos = portfolio.positions[symbol];
    row.querySelector('.pos').textContent = pos
      ? `You own ${pos.qty} · avg ${usd.format(pos.avgCost)} · P/L ${signed((market[symbol].price - pos.avgCost) * pos.qty)}`
      : `You don't own ${symbol} yet.`;
  }

  function updateSummary() {
    const invested = P.marketValue(portfolio, prices());
    const total = portfolio.cash + invested;
    const ret = total - STARTING_CASH;
    $('#total').textContent = usd.format(total);
    const day = $('#day');
    day.textContent = `${signed(ret)} (${pct(ret / STARTING_CASH)}) all time`;
    day.className = `day ${ret >= 0 ? 'up' : 'down'}`;
    $('#cash').textContent = usd.format(portfolio.cash);
    $('#invested').textContent = usd.format(invested);
    $('#owned-count').textContent = Object.keys(portfolio.positions).length;
  }

  function refreshAll() {
    for (const row of rows.values()) updateRow(row, null);
    updateSummary();
  }

  // ---------- Trading ----------
  function execute(symbol, side) {
    const m = market[symbol];
    const before = portfolio;
    const res = side === 'buy'
      ? P.buy(portfolio, symbol, qty, m.price)
      : P.sell(portfolio, symbol, qty, m.price);
    if (!res.ok) {
      vibrate([30, 40, 30]);
      showToast(res.reason, { error: true });
      return null;
    }
    portfolio = res.portfolio;
    lastTrade = { before, trade: res.trade };
    if (!onboarded) {
      onboarded = true;
      for (const r of rows.values()) r.classList.remove('nudge');
    }
    save();
    vibrate(side === 'buy' ? 20 : [12, 50, 12]);
    const t = res.trade;
    showToast(`${t.side === 'buy' ? 'Bought' : 'Sold'} ${t.qty} ${t.symbol} @ ${usd.format(t.price)}`, { undo: true });
    afterPortfolioChange(symbol, side);
    return res.trade;
  }

  function afterPortfolioChange(symbol, side) {
    // Holdings tab membership may have changed; rebuild once animations settle.
    const membershipChanged = tab === 'owned' && visibleSymbols().join() !== [...rows.keys()].join();
    if (membershipChanged) setTimeout(() => { if (!drag) { renderList(); refreshAll(); } }, 450);
    refreshAll();
    const row = rows.get(symbol);
    if (row && side) {
      row.classList.remove('filled-buy', 'filled-sell');
      void row.offsetWidth;
      row.classList.add(`filled-${side}`);
    }
  }

  function undo() {
    if (!lastTrade) return;
    const { before, trade } = lastTrade;
    portfolio = before;
    lastTrade = null;
    save();
    showToast(`Undid ${trade.side} of ${trade.qty} ${trade.symbol}`);
    afterPortfolioChange(trade.symbol, null);
  }

  // ---------- Toast ----------
  const toast = $('#toast');
  const toastUndo = $('#toast-undo');
  let toastTimer;
  function showToast(msg, { undo: canUndo = false, error = false } = {}) {
    $('#toast-msg').textContent = msg;
    toastUndo.hidden = !canUndo;
    toast.classList.toggle('error', error);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      if (canUndo) lastTrade = null;
    }, canUndo ? 4500 : 2200);
  }
  toastUndo.addEventListener('click', () => { clearTimeout(toastTimer); undo(); });

  // ---------- Swipe gesture ----------
  let drag = null;
  let suppressClick = false;
  const LOCK_PX = 10;

  list.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.card');
    if (!card || drag || e.button > 0) return;
    const row = card.parentElement;
    row.classList.remove('settling', 'firing', 'nudge');
    drag = {
      row, card, id: e.pointerId,
      x0: e.clientX, y0: e.clientY,
      mode: 'pending', armed: false, side: null, blocked: false,
      width: row.offsetWidth,
      threshold: Math.min(130, row.offsetWidth * 0.35),
    };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;

    if (drag.mode === 'pending') {
      if (Math.abs(dx) > LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
        drag.mode = 'swipe';
        try { drag.card.setPointerCapture(drag.id); } catch (_) {}
        updateActions(drag.row);
      } else if (Math.abs(dy) > LOCK_PX) {
        drag = null; // vertical scroll wins
        return;
      } else {
        return;
      }
    }

    e.preventDefault();
    const side = dx > 0 ? 'buy' : 'sell';
    if (side !== drag.side) {
      drag.side = side;
      drag.blocked = !!quoteOrder(drag.row.dataset.symbol, side).blocked;
      drag.row.dataset.dir = side;
      drag.row.classList.toggle('blocked', drag.blocked);
    }

    let x = dx;
    if (drag.blocked) {
      // Rubber-band: you can peek at why, but can't commit.
      x = Math.sign(dx) * Math.min(Math.abs(dx) * 0.35, drag.threshold * 0.8);
    }
    drag.card.style.transform = `translateX(${x}px)`;

    const armed = !drag.blocked && Math.abs(dx) >= drag.threshold;
    if (armed !== drag.armed) {
      drag.armed = armed;
      drag.row.classList.toggle('armed', armed);
      if (armed) vibrate(10);
    }
  }, { passive: false });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.mode !== 'swipe') return; // a tap; let click handle it
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);

    if (d.armed && e.type === 'pointerup') {
      const dir = d.side === 'buy' ? 1 : -1;
      const trade = execute(d.row.dataset.symbol, d.side);
      if (trade) {
        // Fling off-screen, then spring back in.
        d.row.classList.add('firing');
        d.card.style.transform = `translateX(${dir * d.width}px)`;
        setTimeout(() => settle(d.row, d.card), 180);
        return;
      }
      d.row.classList.add('shake');
      setTimeout(() => d.row.classList.remove('shake'), 400);
    }
    settle(d.row, d.card);
  }

  function settle(row, card) {
    row.classList.remove('firing', 'armed');
    row.classList.add('settling');
    card.style.transform = '';
    const done = () => {
      row.classList.remove('settling', 'blocked');
      delete row.dataset.dir;
    };
    card.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 350);
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Tap / keyboard: expand row with explicit Buy & Sell buttons.
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.detail button');
    if (btn) {
      const row = btn.closest('.row');
      execute(row.dataset.symbol, btn.classList.contains('do-buy') ? 'buy' : 'sell');
      return;
    }
    const card = e.target.closest('.card');
    if (!card || suppressClick) return;
    toggleRow(card.parentElement);
  });
  list.addEventListener('keydown', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleRow(card.parentElement);
    }
  });
  function toggleRow(row) {
    const open = !row.classList.contains('open');
    for (const r of rows.values()) {
      r.classList.remove('open');
      r.querySelector('.card').setAttribute('aria-expanded', 'false');
    }
    row.classList.toggle('open', open);
    row.querySelector('.card').setAttribute('aria-expanded', String(open));
  }

  // ---------- Controls ----------
  document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => {
    tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    renderList();
  }));

  const sizeButtons = document.querySelectorAll('.size button');
  function setQty(n) {
    qty = n;
    sizeButtons.forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.qty === n)));
    for (const row of rows.values()) updateActions(row);
    save();
  }
  sizeButtons.forEach((b) => b.addEventListener('click', () => setQty(+b.dataset.qty)));

  // Two-tap reset: native confirm() dialogs are blocked in embedded viewers.
  const resetBtn = $('#reset');
  let resetTimer;
  resetBtn.addEventListener('click', () => {
    if (!resetBtn.classList.contains('confirming')) {
      resetBtn.classList.add('confirming');
      resetBtn.textContent = 'Tap again to reset';
      resetTimer = setTimeout(disarmReset, 3000);
      return;
    }
    disarmReset();
    portfolio = P.createPortfolio(STARTING_CASH);
    lastTrade = null;
    save();
    renderList();
    refreshAll();
    showToast(`Reset to ${usd.format(STARTING_CASH)} cash`);
  });
  function disarmReset() {
    clearTimeout(resetTimer);
    resetBtn.classList.remove('confirming');
    resetBtn.textContent = 'Reset';
  }

  // ---------- Simulated market feed ----------
  function tick() {
    for (const s of STOCKS) {
      const m = market[s.symbol];
      if (Math.random() < 0.35) continue; // not every symbol trades every tick
      const prev = m.price;
      m.price = Math.max(0.01, round2(prev * (1 + gauss() * m.vol)));
      m.history.push(m.price);
      if (m.history.length > HISTORY_LEN) m.history.shift();
      const row = rows.get(s.symbol);
      if (row) updateRow(row, Math.sign(m.price - prev));
    }
    updateSummary();
  }

  setQty(qty);
  renderList();
  refreshAll();
  setInterval(tick, TICK_MS);

  // Exposed for automated tests.
  window.__swipeTrade = { market, get portfolio() { return portfolio; } };
})();

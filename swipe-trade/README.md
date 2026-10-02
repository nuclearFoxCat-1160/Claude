# Swipe Trade

A mobile-first investment watchlist where a swipe places a trade immediately.

- **Swipe right → buy**, **swipe left → sell**. Drag past the threshold (the action turns bright and the phone buzzes), then let go to fill at the current price.
- **Shares per swipe** (1 / 5 / 10 / 25) sets the order size. A sell larger than your position sells what you hold.
- If the trade can't happen (not enough cash, or nothing to sell), the card only stretches a little, shows the reason, and snaps back.
- Each fill shows a toast with **Undo** for 4.5 seconds.
- Tap a row (or focus it and press Enter) to open Buy/Sell buttons, for anyone who can't or won't swipe.
- The **Holdings** tab shows your positions with market value and unrealized P/L.

Prices come from a simulated feed. The portfolio starts with $10,000 of paper cash and is saved in `localStorage`.

## Run

No build step and no dependencies. Open `index.html` in a browser (use device emulation for touch), or serve the folder:

```sh
python3 -m http.server -d swipe-trade 8000
```

## Test

```sh
node --test swipe-trade/test/*.test.js
```

## Files

- `portfolio.js`: pure buy/sell/valuation logic, shared by the app and the tests
- `app.js`: rendering, swipe gesture, simulated price feed, undo
- `styles.css`: dark/light themes and swipe animations

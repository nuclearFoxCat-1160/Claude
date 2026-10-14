// Small helpers shared by the guest and admin pages.

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

function makeMoney(currency) {
  let fmt;
  try {
    fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  } catch {
    fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  }
  return (cents) => fmt.format(cents / 100);
}

function currencySymbol(currency) {
  try {
    const part = new Intl.NumberFormat(undefined, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part ? part.value : currency;
  } catch {
    return '$';
  }
}

function recipientLabel(recipient, info) {
  if (recipient === 'bride') return `For ${info.brideName}`;
  if (recipient === 'groom') return `For ${info.groomName}`;
  return `For both of us`;
}

const LOCK_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

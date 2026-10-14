(async function () {
  const $ = (s) => document.querySelector(s);
  const grid = $('#dreams');
  const dialog = $('#give');
  const form = $('#give-form');
  const thanks = $('#give-thanks');
  const errorBox = $('#g-error');
  const select = $('#g-dream');

  $('#lock-hero').innerHTML = LOCK_ICON;
  $('#lock-form').innerHTML = LOCK_ICON;

  let info, dreams, money;
  try {
    [info, dreams] = await Promise.all([api('/api/info'), api('/api/dreams')]);
  } catch (e) {
    grid.replaceChildren(el('div', { class: 'empty' }, 'Sorry, we could not load the page. Please refresh to try again.'));
    return;
  }
  money = makeMoney(info.currency);

  const coupleName = `${info.brideName} & ${info.groomName}`;
  document.title = `${coupleName} · Wedding Wishes`;
  $('#couple').replaceChildren(info.brideName, ' ', el('span', { class: 'amp' }, '&'), ' ', info.groomName);
  $('#welcome').textContent = info.welcome;
  document.querySelectorAll('.couple-short').forEach((n) => (n.textContent = coupleName));
  $('#g-symbol').textContent = currencySymbol(info.currency);

  // quick-pick amounts
  const chips = $('#g-chips');
  for (const v of [25, 50, 100, 250]) {
    chips.append(
      el('button', { type: 'button', onclick: () => { $('#g-amount').value = v; $('#g-amount').focus(); } }, money(v * 100))
    );
  }

  // dream cards
  if (!dreams.length) {
    grid.replaceChildren(el('div', { class: 'empty' }, 'Our wish list is coming soon — please check back.'));
  } else {
    grid.replaceChildren(
      ...dreams.map((d) =>
        el('article', { class: 'card' },
          el('div', { class: 'img', style: d.image ? `background-image:url("${encodeURI(d.image)}")` : null, role: 'img', 'aria-label': d.title }, d.image ? '' : '♥'),
          el('div', { class: 'body' },
            el('span', { class: `tag ${d.recipient}` }, recipientLabel(d.recipient, info)),
            el('h3', {}, d.title),
            d.description ? el('p', { class: 'desc' }, d.description) : null,
            el('div', { class: 'foot' },
              el('div', { class: 'goal' }, el('small', {}, 'Dream goal'), money(d.goal)),
              el('button', { type: 'button', onclick: () => open(d.id) }, 'Contribute')
            )
          )
        )
      )
    );
  }

  select.replaceChildren(
    el('option', { value: '' }, 'Choose a dream…'),
    ...dreams.map((d) => el('option', { value: d.id }, `${d.title} — ${recipientLabel(d.recipient, info).toLowerCase()}`))
  );

  function open(dreamId) {
    form.reset();
    errorBox.textContent = '';
    form.classList.remove('hidden');
    thanks.classList.add('hidden');
    select.value = dreamId || '';
    dialog.showModal();
    (dreamId ? $('#g-name') : select).focus();
  }

  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if (!data.dreamId) return (errorBox.textContent = 'Please choose a dream.');
    if (!data.name.trim()) return (errorBox.textContent = 'Please tell us your name.');
    if (!(Number(data.amount) > 0)) return (errorBox.textContent = 'Please enter an amount.');

    const btn = $('#g-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const saved = await api('/api/contributions', { method: 'POST', body: data });
      $('#thanks-text').textContent =
        `${saved.name}, your gift of ${money(saved.amount)} towards “${saved.dreamTitle}” means the world to us.`;
      form.classList.add('hidden');
      thanks.classList.remove('hidden');
    } catch (err) {
      errorBox.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send my gift';
    }
  });
})();

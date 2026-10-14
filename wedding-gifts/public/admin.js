(function () {
  const $ = (s) => document.querySelector(s);
  const state = { settings: null, dreams: [], gifts: [], money: makeMoney('USD'), editing: null, image: undefined };

  // ---------- auth ----------
  async function boot() {
    const { admin } = await api('/api/admin/me');
    if (admin) showApp();
    else showLogin();
  }

  function showLogin() {
    $('#app-view').classList.add('hidden');
    $('#login-view').classList.remove('hidden');
    $('#password').focus();
  }

  async function showApp() {
    $('#login-view').classList.add('hidden');
    $('#app-view').classList.remove('hidden');
    await refresh();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    try {
      await api('/api/admin/login', { method: 'POST', body: { password: $('#password').value } });
      $('#password').value = '';
      showApp();
    } catch (err) {
      $('#login-error').textContent = err.message;
    }
  });

  $('#logout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  // Any 401 while working (session expired) sends the couple back to sign in.
  async function guarded(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 401) showLogin();
      throw err;
    }
  }

  // ---------- data ----------
  async function refresh() {
    await guarded(async () => {
      const [settings, dreams, gifts] = await Promise.all([
        api('/api/admin/settings'),
        api('/api/admin/dreams'),
        api('/api/admin/contributions'),
      ]);
      Object.assign(state, { settings, dreams, gifts, money: makeMoney(settings.currency) });
    });
    renderAll();
  }

  function renderAll() {
    const s = state.settings;
    $('#title').textContent = `${s.brideName} & ${s.groomName}`;
    document.querySelector('[data-name="bride"]').textContent = s.brideName;
    document.querySelector('[data-name="groom"]').textContent = s.groomName;
    $('#d-symbol').textContent = currencySymbol(s.currency);
    renderDreams();
    renderGifts();
    renderSettings();
  }

  // ---------- tabs ----------
  document.querySelectorAll('[data-tab]').forEach((tab) =>
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      document.querySelectorAll('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.tab));
    })
  );

  // ---------- dreams ----------
  function renderDreams() {
    const list = $('#dream-list');
    if (!state.dreams.length) {
      list.replaceChildren(el('div', { class: 'empty' }, 'No dreams yet. Add your first one — a honeymoon, a sofa, a puppy…'));
      return;
    }
    list.replaceChildren(
      ...state.dreams.map((d) => {
        const pct = Math.min(100, Math.round((d.raised / d.goal) * 100));
        return el('div', { class: 'dream-row' },
          el('div', { class: 'thumb', style: d.image ? `background-image:url("${encodeURI(d.image)}")` : null }),
          el('div', {},
            el('span', { class: `tag ${d.recipient}` }, recipientLabel(d.recipient, state.settings)),
            el('h3', { style: 'margin-top:6px' }, d.title),
            el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i', { style: `width:${pct}%` })),
            el('div', { class: 'small muted' },
              `${state.money(d.raised)} of ${state.money(d.goal)} · ${d.contributionCount} ${d.contributionCount === 1 ? 'gift' : 'gifts'}`)
          ),
          el('div', { class: 'btns' },
            el('button', { type: 'button', class: 'ghost', onclick: () => openDream(d) }, 'Edit'),
            el('button', { type: 'button', class: 'danger', onclick: () => deleteDream(d) }, 'Delete')
          )
        );
      })
    );
  }

  const dreamDialog = $('#dream-dialog');
  const dreamForm = $('#dream-form');
  const preview = $('#d-preview');

  function setPreview(src) {
    preview.classList.toggle('hidden', !src);
    $('#d-remove-image').classList.toggle('hidden', !src);
    if (src) preview.src = src;
    else preview.removeAttribute('src');
  }

  function openDream(dream) {
    state.editing = dream || null;
    state.image = undefined; // undefined = unchanged, null = remove, string = new data URL
    dreamForm.reset();
    $('#dream-error').textContent = '';
    $('#dream-dialog-title').textContent = dream ? 'Edit dream' : 'Add a dream';
    if (dream) {
      dreamForm.elements.title.value = dream.title;
      dreamForm.elements.description.value = dream.description || '';
      dreamForm.elements.goal.value = (dream.goal / 100).toFixed(2);
      dreamForm.querySelector(`[name=recipient][value=${dream.recipient}]`).checked = true;
    }
    setPreview(dream && dream.image);
    dreamDialog.showModal();
    dreamForm.elements.title.focus();
  }

  $('#add-dream').addEventListener('click', () => openDream(null));
  dreamDialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === dreamDialog) dreamDialog.close();
  });

  $('#d-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    $('#dream-error').textContent = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      $('#dream-error').textContent = 'That image is larger than 5 MB — please choose a smaller one.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.image = reader.result;
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  });

  $('#d-remove-image').addEventListener('click', () => {
    state.image = null;
    $('#d-image').value = '';
    setPreview(null);
  });

  dreamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#dream-error').textContent = '';
    const f = dreamForm.elements;
    if (!f.title.value.trim()) return ($('#dream-error').textContent = 'Please name the dream.');
    if (!(Number(f.goal.value) > 0)) return ($('#dream-error').textContent = 'Please enter how much it needs.');

    const body = {
      title: f.title.value,
      description: f.description.value,
      goal: f.goal.value,
      recipient: dreamForm.querySelector('[name=recipient]:checked').value,
    };
    if (typeof state.image === 'string') body.image = state.image;
    if (state.image === null) body.removeImage = true;

    const btn = $('#dream-save');
    btn.disabled = true;
    try {
      await guarded(() =>
        state.editing
          ? api(`/api/admin/dreams/${state.editing.id}`, { method: 'PUT', body })
          : api('/api/admin/dreams', { method: 'POST', body })
      );
      dreamDialog.close();
      await refresh();
    } catch (err) {
      $('#dream-error').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  async function deleteDream(d) {
    const extra = d.contributionCount
      ? `\n\nIts ${d.contributionCount} contribution(s) will stay in your Contributions list.`
      : '';
    if (!confirm(`Delete “${d.title}”?${extra}`)) return;
    await guarded(() => api(`/api/admin/dreams/${d.id}`, { method: 'DELETE' })).catch((err) => alert(err.message));
    await refresh();
  }

  // ---------- contributions ----------
  const filter = $('#filter');
  filter.addEventListener('change', renderGifts);

  function filteredGifts() {
    return filter.value ? state.gifts.filter((g) => g.dreamId === filter.value) : state.gifts;
  }

  function renderGifts() {
    const current = filter.value;
    filter.replaceChildren(
      el('option', { value: '' }, 'All dreams'),
      ...state.dreams.map((d) => el('option', { value: d.id }, d.title))
    );
    filter.value = state.dreams.some((d) => d.id === current) ? current : '';

    const gifts = filteredGifts();
    const total = gifts.reduce((s, g) => s + g.amount, 0);
    const guests = new Set(gifts.map((g) => g.name.trim().toLowerCase())).size;
    const notes = gifts.filter((g) => g.message).length;
    $('#stats').replaceChildren(
      ...[
        [state.money(total), 'Total pledged'],
        [gifts.length, gifts.length === 1 ? 'Contribution' : 'Contributions'],
        [guests, guests === 1 ? 'Guest' : 'Guests'],
        [notes, notes === 1 ? 'Message' : 'Messages'],
      ].map(([n, l]) => el('div', { class: 'stat' }, el('div', { class: 'n' }, n), el('div', { class: 'l' }, l)))
    );

    const rows = $('#gift-rows');
    if (!gifts.length) {
      rows.replaceChildren(el('tr', {}, el('td', { colspan: 6, class: 'muted', style: 'text-align:center;padding:32px' }, 'No contributions yet.')));
      return;
    }
    const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const titleOf = (g) => (state.dreams.find((d) => d.id === g.dreamId) || {}).title || `${g.dreamTitle} (removed)`;
    rows.replaceChildren(
      ...gifts.map((g) =>
        el('tr', {},
          el('td', { class: 'small muted' }, dateFmt.format(new Date(g.createdAt))),
          el('td', {}, g.name),
          el('td', {}, titleOf(g)),
          el('td', { class: 'amount' }, state.money(g.amount)),
          el('td', { class: 'msg' }, g.message || el('span', { class: 'muted' }, '—')),
          el('td', {}, el('button', { type: 'button', class: 'link small', onclick: () => deleteGift(g), 'aria-label': `Delete contribution from ${g.name}` }, 'Delete'))
        )
      )
    );
  }

  async function deleteGift(g) {
    if (!confirm(`Delete the ${state.money(g.amount)} contribution from ${g.name}? This cannot be undone.`)) return;
    await guarded(() => api(`/api/admin/contributions/${g.id}`, { method: 'DELETE' })).catch((err) => alert(err.message));
    await refresh();
  }

  $('#export').addEventListener('click', () => {
    const esc = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheet apps from running formulas
      return `"${s.replace(/"/g, '""')}"`;
    };
    const titleOf = (g) => (state.dreams.find((d) => d.id === g.dreamId) || {}).title || g.dreamTitle;
    const lines = [
      ['Date', 'Guest', 'Dream', `Amount (${state.settings.currency})`, 'Message'].map(esc).join(','),
      ...filteredGifts().map((g) =>
        [g.createdAt, g.name, titleOf(g), (g.amount / 100).toFixed(2), g.message].map(esc).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'wedding-contributions.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  // ---------- settings ----------
  const settingsForm = $('#settings-form');
  function renderSettings() {
    const s = state.settings;
    settingsForm.elements.brideName.value = s.brideName;
    settingsForm.elements.groomName.value = s.groomName;
    settingsForm.elements.currency.value = s.currency;
    settingsForm.elements.welcome.value = s.welcome;
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#settings-error').textContent = '';
    try {
      await guarded(() => api('/api/admin/settings', { method: 'PUT', body: Object.fromEntries(new FormData(settingsForm)) }));
      await refresh();
      $('#settings-saved').classList.remove('hidden');
      setTimeout(() => $('#settings-saved').classList.add('hidden'), 2000);
    } catch (err) {
      $('#settings-error').textContent = err.message;
    }
  });

  boot().catch(() => showLogin());
})();

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function setup(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-'));
  const { server } = createApp({ dataDir, adminPassword: 'secret' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  let cookie = '';
  async function call(method, url, body, { auth = false } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth && cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, body: ct.includes('json') ? await res.json() : await res.text() };
  }
  async function login() {
    const r = await call('POST', '/api/admin/login', { password: 'secret' });
    assert.strictEqual(r.status, 200);
  }
  return { call, login, base, dataDir };
}

test('admin endpoints require sign-in', async (t) => {
  const { call } = await setup(t);
  for (const [m, u] of [
    ['GET', '/api/admin/contributions'],
    ['GET', '/api/admin/dreams'],
    ['POST', '/api/admin/dreams'],
    ['GET', '/api/admin/settings'],
  ]) {
    assert.strictEqual((await call(m, u, m === 'POST' ? {} : undefined)).status, 401, `${m} ${u}`);
  }
});

test('wrong password is rejected', async (t) => {
  const { call } = await setup(t);
  const r = await call('POST', '/api/admin/login', { password: 'nope' });
  assert.strictEqual(r.status, 401);
  assert.strictEqual((await call('GET', '/api/admin/me', null, { auth: true })).body.admin, false);
});

test('full flow: admin adds dream, guest contributes, only admin sees it', async (t) => {
  const { call, login } = await setup(t);
  await login();

  const created = await call('POST', '/api/admin/dreams', {
    title: 'Honeymoon in Kyoto', description: 'Temples and ramen', goal: '3000', recipient: 'both', image: PNG,
  }, { auth: true });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.goal, 300000);
  assert.match(created.body.image, /^\/uploads\/[\w-]+\.png$/);

  // image is served
  const img = await call('GET', created.body.image);
  assert.strictEqual(img.status, 200);

  // guest view of dreams has no money totals
  const pub = await call('GET', '/api/dreams');
  assert.deepStrictEqual(Object.keys(pub.body[0]).sort(), ['description', 'goal', 'id', 'image', 'recipient', 'title']);

  const gift = await call('POST', '/api/contributions', {
    dreamId: created.body.id, name: 'Auntie May', amount: 150.5, message: 'Congratulations!',
  });
  assert.strictEqual(gift.status, 201);
  assert.strictEqual(gift.body.amount, 15050);
  assert.strictEqual(gift.body.message, undefined);

  // a guest still cannot see anything about contributions
  const pubAfter = await call('GET', '/api/dreams');
  assert.ok(!JSON.stringify(pubAfter.body).includes('Auntie'));
  assert.ok(!('raised' in pubAfter.body[0]));
  assert.strictEqual((await call('GET', '/api/admin/contributions')).status, 401);

  // the couple sees everything
  const list = await call('GET', '/api/admin/contributions', null, { auth: true });
  assert.strictEqual(list.body.length, 1);
  assert.strictEqual(list.body[0].name, 'Auntie May');
  assert.strictEqual(list.body[0].message, 'Congratulations!');
  const dreams = await call('GET', '/api/admin/dreams', null, { auth: true });
  assert.strictEqual(dreams.body[0].raised, 15050);
  assert.strictEqual(dreams.body[0].contributionCount, 1);

  // logout ends the session
  await call('POST', '/api/admin/logout', null, { auth: true });
  assert.strictEqual((await call('GET', '/api/admin/contributions', null, { auth: true })).status, 401);
});

test('validation', async (t) => {
  const { call, login } = await setup(t);
  await login();
  const bad = [
    { title: '', goal: 10, recipient: 'both' },
    { title: 'X', goal: -5, recipient: 'both' },
    { title: 'X', goal: 'abc', recipient: 'both' },
    { title: 'X', goal: 10.001, recipient: 'both' },
    { title: 'X', goal: 10, recipient: 'cousin' },
    { title: 'X', goal: 10, recipient: 'both', image: 'data:image/png;base64,aGVsbG8=' }, // not really a PNG
  ];
  for (const body of bad) {
    assert.strictEqual((await call('POST', '/api/admin/dreams', body, { auth: true })).status, 400, JSON.stringify(body));
  }
  const d = await call('POST', '/api/admin/dreams', { title: 'Sofa', goal: 800, recipient: 'bride' }, { auth: true });
  for (const body of [
    { dreamId: 'nope', name: 'A', amount: 10 },
    { dreamId: d.body.id, name: '', amount: 10 },
    { dreamId: d.body.id, name: 'A', amount: 0 },
    { dreamId: d.body.id, name: 'A', amount: 10, message: 'x'.repeat(2001) },
  ]) {
    assert.strictEqual((await call('POST', '/api/contributions', body)).status, 400, JSON.stringify(body));
  }
});

test('editing and deleting dreams keeps contributions', async (t) => {
  const { call, login, dataDir } = await setup(t);
  await login();
  const d = await call('POST', '/api/admin/dreams', { title: 'Puppy', goal: 500, recipient: 'groom', image: PNG }, { auth: true });
  const oldFile = path.join(dataDir, 'uploads', path.basename(d.body.image));
  assert.ok(fs.existsSync(oldFile));

  const upd = await call('PUT', `/api/admin/dreams/${d.body.id}`, { title: 'Golden retriever puppy', removeImage: true }, { auth: true });
  assert.strictEqual(upd.body.title, 'Golden retriever puppy');
  assert.strictEqual(upd.body.image, null);
  assert.strictEqual(upd.body.goal, 50000);
  assert.ok(!fs.existsSync(oldFile));

  await call('POST', '/api/contributions', { dreamId: d.body.id, name: 'Bob', amount: 20 });
  assert.strictEqual((await call('DELETE', `/api/admin/dreams/${d.body.id}`, null, { auth: true })).status, 200);
  const list = await call('GET', '/api/admin/contributions', null, { auth: true });
  assert.strictEqual(list.body[0].dreamTitle, 'Golden retriever puppy');
});

test('data persists across restarts', async (t) => {
  const { call, login, dataDir } = await setup(t);
  await login();
  await call('PUT', '/api/admin/settings', { brideName: 'Ana', groomName: 'Ben', currency: 'eur' }, { auth: true });
  await call('POST', '/api/admin/dreams', { title: 'Bikes', goal: 900, recipient: 'both' }, { auth: true });

  const { server } = createApp({ dataDir, adminPassword: 'secret' });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const info = await (await fetch(`${base}/api/info`)).json();
  assert.deepStrictEqual([info.brideName, info.groomName, info.currency], ['Ana', 'Ben', 'EUR']);
  assert.strictEqual((await (await fetch(`${base}/api/dreams`)).json())[0].title, 'Bikes');
});

test('static files: pages served, path traversal blocked, data dir not exposed', async (t) => {
  const { call } = await setup(t);
  assert.strictEqual((await call('GET', '/')).status, 200);
  assert.strictEqual((await call('GET', '/admin')).status, 200);
  assert.strictEqual((await call('GET', '/..%2fserver.js')).status, 404);
  assert.strictEqual((await call('GET', '/uploads/..%2fdb.json')).status, 404);
  assert.strictEqual((await call('GET', '/%E0%A4%A')).status, 400);
});

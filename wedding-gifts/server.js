'use strict';

// Wedding gift collection app — zero dependencies, Node >= 18.
//
//   Guests  → GET  /                 browse the couple's dreams and pledge a gift
//   Couple  → GET  /admin            manage dreams, read every contribution
//
// Privacy model: the public API never returns contributions, totals or
// progress. Everything about who gave what lives behind the admin session.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Store } = require('./lib/store');

const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RECIPIENTS = ['bride', 'groom', 'both'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

// ---------- helpers ----------

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('not an object');
        }
        resolve(parsed);
      } catch {
        reject(new HttpError(400, 'Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function text(value, field, { max, required = false } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
  value = value.trim();
  if (required && !value) throw new HttpError(400, `${field} is required.`);
  if (value.length > max) throw new HttpError(400, `${field} must be at most ${max} characters.`);
  return value;
}

// Amounts travel as decimal numbers/strings and are stored as integer cents.
function cents(value, field, { min = 1, max = 100_000_000_00 } = {}) {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new HttpError(400, `${field} must be a number.`);
  const c = Math.round(n * 100);
  if (Math.abs(n * 100 - c) > 1e-6) throw new HttpError(400, `${field} can have at most 2 decimal places.`);
  if (c < min) throw new HttpError(400, `${field} must be at least ${(min / 100).toFixed(2)}.`);
  if (c > max) throw new HttpError(400, `${field} is too large.`);
  return c;
}

function sniffImage(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return '.gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp';
  return null;
}

// ---------- app ----------

function createApp({ dataDir, adminPassword }) {
  if (!adminPassword) throw new Error('adminPassword is required');
  const store = new Store(dataDir);
  const sessions = new Map(); // token -> expiresAt
  const passwordHash = crypto.createHash('sha256').update(adminPassword).digest();
  const rateBuckets = new Map(); // ip -> { count, resetAt }

  function rateLimit(req, key, limit, windowMs) {
    const id = `${key}:${req.socket.remoteAddress}`;
    const now = Date.now();
    let b = rateBuckets.get(id);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(id, b);
    }
    b.count += 1;
    if (b.count > limit) throw new HttpError(429, 'Too many attempts — please wait a few minutes and try again.');
  }

  function isAdmin(req) {
    const token = parseCookies(req.headers.cookie).wg_session;
    if (!token) return false;
    const exp = sessions.get(token);
    if (!exp) return false;
    if (exp < Date.now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  function requireAdmin(req) {
    if (!isAdmin(req)) throw new HttpError(401, 'Please sign in.');
  }

  function sessionCookie(req, token, maxAgeSec) {
    const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
    return `wg_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
  }

  async function saveImage(dataUrl) {
    const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl || '');
    if (!m) throw new HttpError(400, 'Image must be a PNG, JPEG, WebP or GIF file.');
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image must be 5 MB or smaller.');
    const ext = sniffImage(buf);
    if (!ext) throw new HttpError(400, 'Image must be a PNG, JPEG, WebP or GIF file.');
    const name = `${Store.id()}${ext}`;
    await fs.promises.writeFile(path.join(store.uploadsDir, name), buf);
    return `/uploads/${name}`;
  }

  async function removeImage(url) {
    if (!url || !url.startsWith('/uploads/')) return;
    const file = path.join(store.uploadsDir, path.basename(url));
    await fs.promises.unlink(file).catch(() => {});
  }

  function publicDream(d) {
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      goal: d.goal,
      recipient: d.recipient,
      image: d.image || null,
    };
  }

  function dreamFields(body, { partial }) {
    const out = {};
    if (!partial || body.title !== undefined) out.title = text(body.title, 'Dream title', { max: 120, required: true });
    if (!partial || body.description !== undefined) out.description = text(body.description, 'Description', { max: 1000 });
    if (!partial || body.goal !== undefined) out.goal = cents(body.goal, 'Amount needed');
    if (!partial || body.recipient !== undefined) {
      if (!RECIPIENTS.includes(body.recipient)) throw new HttpError(400, 'Choose who this dream is for: bride, groom or both.');
      out.recipient = body.recipient;
    }
    return out;
  }

  function dreamsWithTotals() {
    const contributions = store.listContributions();
    return store.listDreams().map((d) => {
      const mine = contributions.filter((c) => c.dreamId === d.id);
      return { ...d, raised: mine.reduce((s, c) => s + c.amount, 0), contributionCount: mine.length };
    });
  }

  // ---- routes ----
  const routes = [
    // public
    ['GET', '/api/info', async () => {
      const s = store.getSettings();
      return { brideName: s.brideName, groomName: s.groomName, welcome: s.welcome, currency: s.currency };
    }],
    ['GET', '/api/dreams', async () => store.listDreams().map(publicDream)],
    ['POST', '/api/contributions', async (req) => {
      rateLimit(req, 'contribute', 20, 10 * 60 * 1000);
      const body = await readJson(req, 16 * 1024);
      const dream = store.getDream(typeof body.dreamId === 'string' ? body.dreamId : '');
      if (!dream) throw new HttpError(400, 'Please choose one of the dreams.');
      const c = await store.addContribution({
        dreamId: dream.id,
        dreamTitle: dream.title,
        name: text(body.name, 'Your name', { max: 100, required: true }),
        amount: cents(body.amount, 'Amount', { max: 10_000_000 }),
        message: text(body.message, 'Message', { max: 2000 }),
      });
      // Echo back only what the guest themselves typed — nothing about others.
      return [201, { id: c.id, dreamTitle: c.dreamTitle, amount: c.amount, name: c.name }];
    }],

    // admin auth
    ['POST', '/api/admin/login', async (req) => {
      rateLimit(req, 'login', 10, 15 * 60 * 1000);
      const body = await readJson(req, 4 * 1024);
      const given = crypto.createHash('sha256').update(String(body.password || '')).digest();
      if (!crypto.timingSafeEqual(given, passwordHash)) throw new HttpError(401, 'That password is not right.');
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, Date.now() + SESSION_TTL_MS);
      return [200, { ok: true }, { 'Set-Cookie': sessionCookie(req, token, SESSION_TTL_MS / 1000) }];
    }],
    ['POST', '/api/admin/logout', async (req) => {
      sessions.delete(parseCookies(req.headers.cookie).wg_session);
      return [200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) }];
    }],
    ['GET', '/api/admin/me', async (req) => ({ admin: isAdmin(req) })],

    // admin data
    ['GET', '/api/admin/settings', async (req) => {
      requireAdmin(req);
      return store.getSettings();
    }],
    ['PUT', '/api/admin/settings', async (req) => {
      requireAdmin(req);
      const body = await readJson(req, 16 * 1024);
      const patch = {};
      if (body.brideName !== undefined) patch.brideName = text(body.brideName, 'Bride name', { max: 80, required: true });
      if (body.groomName !== undefined) patch.groomName = text(body.groomName, 'Groom name', { max: 80, required: true });
      if (body.welcome !== undefined) patch.welcome = text(body.welcome, 'Welcome message', { max: 1000 });
      if (body.currency !== undefined) {
        const cur = text(body.currency, 'Currency', { max: 3, required: true }).toUpperCase();
        if (!/^[A-Z]{3}$/.test(cur)) throw new HttpError(400, 'Currency must be a 3-letter code such as USD.');
        patch.currency = cur;
      }
      return store.updateSettings(patch);
    }],
    ['GET', '/api/admin/dreams', async (req) => {
      requireAdmin(req);
      return dreamsWithTotals();
    }],
    ['POST', '/api/admin/dreams', async (req) => {
      requireAdmin(req);
      const body = await readJson(req, 8 * 1024 * 1024);
      const fields = dreamFields(body, { partial: false });
      if (body.image) fields.image = await saveImage(body.image);
      return [201, await store.addDream(fields)];
    }],
    ['PUT', /^\/api\/admin\/dreams\/([\w-]+)$/, async (req, [id]) => {
      requireAdmin(req);
      const existing = store.getDream(id);
      if (!existing) throw new HttpError(404, 'Dream not found.');
      const body = await readJson(req, 8 * 1024 * 1024);
      const fields = dreamFields(body, { partial: true });
      const oldImage = existing.image;
      if (body.image) fields.image = await saveImage(body.image);
      else if (body.removeImage) fields.image = null;
      const updated = await store.updateDream(id, fields);
      if ('image' in fields && oldImage !== fields.image) await removeImage(oldImage);
      return updated;
    }],
    ['DELETE', /^\/api\/admin\/dreams\/([\w-]+)$/, async (req, [id]) => {
      requireAdmin(req);
      const removed = await store.deleteDream(id);
      if (!removed) throw new HttpError(404, 'Dream not found.');
      await removeImage(removed.image);
      return { ok: true };
    }],
    ['GET', '/api/admin/contributions', async (req) => {
      requireAdmin(req);
      return store.listContributions();
    }],
    ['DELETE', /^\/api\/admin\/contributions\/([\w-]+)$/, async (req, [id]) => {
      requireAdmin(req);
      if (!(await store.deleteContribution(id))) throw new HttpError(404, 'Contribution not found.');
      return { ok: true };
    }],
  ];

  async function serveFile(res, root, rel, extraHeaders = {}) {
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep)) return send(res, 404, 'Not found');
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) return send(res, 404, 'Not found');
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders,
      });
      fs.createReadStream(file).pipe(res);
    } catch {
      send(res, 404, 'Not found');
    }
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      throw new HttpError(400, 'Bad request.');
    }

    if (pathname.startsWith('/api/')) {
      for (const [method, pattern, handler] of routes) {
        if (method !== req.method) continue;
        const match = typeof pattern === 'string' ? (pattern === pathname ? [] : null) : pattern.exec(pathname)?.slice(1);
        if (!match) continue;
        const result = await handler(req, match);
        const [status, body, headers] = Array.isArray(result) && typeof result[0] === 'number' ? result : [200, result];
        return send(res, status, body, { 'Cache-Control': 'no-store', ...headers });
      }
      throw new HttpError(404, 'Not found.');
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
    if (pathname.startsWith('/uploads/')) {
      return serveFile(res, store.uploadsDir, path.basename(pathname), { 'Cache-Control': 'public, max-age=31536000, immutable' });
    }
    if (pathname === '/') return serveFile(res, PUBLIC_DIR, 'index.html');
    if (pathname === '/admin' || pathname === '/admin/') return serveFile(res, PUBLIC_DIR, 'admin.html');
    return serveFile(res, PUBLIC_DIR, pathname.slice(1));
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: 'Something went wrong. Please try again.' });
    });
  });

  return { server, store };
}

module.exports = { createApp };

if (require.main === module) {
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = crypto.randomBytes(9).toString('base64url');
    console.warn(`ADMIN_PASSWORD is not set. Using a one-time password for this run: ${adminPassword}`);
  }
  const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
  const port = Number(process.env.PORT) || 3000;
  const { server } = createApp({ dataDir, adminPassword });
  server.listen(port, () => {
    console.log(`Wedding gifts running at http://localhost:${port}  (admin: http://localhost:${port}/admin)`);
  });
}

# Wedding Gifts

A small, private wedding gift collection app.

- **The couple (admin)** signs in at `/admin` to add "dreams": what it is, how much it needs, an image, and who it's for (bride, groom or both). They see every contribution, with totals per dream, messages, and a CSV export.
- **Wedding guests** open `/`, browse the dreams, and say how much they'd like to contribute, to which dream, with an optional greeting or note.

## Privacy

Guests are told on the page and in the gift form that only the couple can see their contribution. The server enforces this:

- The public API (`/api/dreams`, `/api/info`) never returns contributions, names, amounts raised, totals or progress.
- After submitting, a guest gets back only what they typed themselves (minus the message).
- Every `/api/admin/*` data endpoint needs the couple's session (HttpOnly, SameSite=Strict cookie). Login is rate-limited and uses a constant-time password check.
- `test/api.test.js` covers these rules.

> This app records **pledges**. It doesn't take payments. The couple follows up with guests (or shares payment details on the page) however they like.

## Run it

Requires Node.js 18 or newer. There are no dependencies to install.

```bash
cd wedding-gifts
ADMIN_PASSWORD='choose-a-good-one' npm start
# guests:  http://localhost:3000
# couple:  http://localhost:3000/admin
```

| Env var          | Default        | Purpose                                                   |
| ---------------- | -------------- | --------------------------------------------------------- |
| `ADMIN_PASSWORD` | random, printed | Couple's sign-in password. **Set this in production.**    |
| `PORT`           | `3000`         | HTTP port                                                 |
| `DATA_DIR`       | `./data`       | Where `db.json` and uploaded images are stored            |

After signing in, open **Settings** to set the bride's and groom's names, the currency (e.g. USD, HKD, EUR) and the welcome message.

### Deploying

Run it on any host with Node and a persistent disk for `DATA_DIR`, behind HTTPS (for example a reverse proxy that sets `X-Forwarded-Proto: https`, which marks the cookie `Secure`). Back up `DATA_DIR`. It holds all dreams, contributions and images.

## Test

```bash
npm test
```

## Layout

```
server.js        HTTP server, routes, auth, validation
lib/store.js     JSON-file storage (atomic writes)
public/          guest page (index.html, guest.js), admin page (admin.html, admin.js), shared styles
test/            API tests (node:test)
```

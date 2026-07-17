---
name: verify
description: Build, launch, and drive Annz Bricks (Vite+React client, Express+Mongo server) end-to-end in a real browser to verify changes.
---

# Verifying Annz Bricks

## Launch

- Server: `cd server && npm run dev` → Express on **http://localhost:5005** (needs `server/.env` with `MONGODB_URI`, `JWT_SECRET`, `PORT=5005`, `TAX_RATE`). Seed with `npm run seed` (re-seeds 29 products + admin, clears carts/users).
- Client: `cd client && npm run dev` → Vite on **http://localhost:5173**, proxies `/api` and `/images` to 5005.
- Check for stale listeners first: `lsof -nP -iTCP:5005 -sTCP:LISTEN` — an old server process serving old code has caused confusion before.
- Compile check: `cd client && npx vite build`.

## Drive (browser)

No Playwright browsers are downloaded on this machine, but Chrome is installed — use `chromium.launch({ channel: 'chrome', headless: true })` with the `playwright` npm package installed in a scratch dir.

Known-good full-journey script pattern (catalogue → filter → detail → guest cart → login gate → register → merge → 3-step checkout → decline card 4000 0000 0000 0002 (402) → success card 4242… → confirmation → orders → Apple Pay & Zip flows → admin guards): see the flows exercised in `docs/OVERHAUL_PLAN.md` verification sections.

- Admin login: `admin@annzbricks.com` / `12345@`.
- Registering a throwaway user: any unique email, password ≥ 6 chars.
- Simulated payment adds ~1.5s latency to `POST /api/orders`; wait accordingly.

## Gotchas learned the hard way

- **Do not reintroduce framer-motion layout projection into routed pages.** `layout` props, `layoutId` shared elements, and `AnimatePresence mode="popLayout"` inside a page that lives under RootLayout's `AnimatePresence mode="wait"` deadlock the page transition after any reflow (page exits to opacity 0 and never unmounts). Filter chips / method selector / step indicator use plain CSS transitions for this reason.
- **Route guards must redirect imperatively** (`useEffect` + `navigate`), never `<Navigate>`: exiting subtrees are retained by AnimatePresence and a retained `<Navigate>` re-fires in a loop, corrupting `location.state.from`.
- React StrictMode double-fires effects in dev: the guest-cart merge claims localStorage synchronously before awaiting to stay idempotent.
- Vite dev server (5173) is often already running from the user's `npm run dev`; HMR picks up client edits, but give it a beat (or reload) before re-driving after an `index.html` change.

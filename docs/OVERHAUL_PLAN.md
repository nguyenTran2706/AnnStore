# Annz Bricks — Major Overhaul: UI/UX + Auth-Gated Checkout + Image Fix

## Context

AnnStore ("Annz Bricks") is a working LEGO e-commerce demo (Vite+React+Tailwind client, Express+Mongoose server) but it is minimal: no routing (conditional rendering in a 229-line `App.jsx` god-context), no customer accounts (admin "login" is a plaintext compare with no token, and product CRUD endpoints are completely unprotected), no real checkout (one button that decrements stock and wipes a **globally shared** cart — no Order record, no payment, no address), and product images use `object-cover` in `aspect-[4/3]` frames, which crops the transparent, mixed-aspect LEGO PNGs.

This plan delivers: a multi-page UI/UX overhaul with Framer Motion animations; full customer auth (JWT, bcrypt) required at checkout; a detailed 3-step checkout with **simulated** payment methods (Credit Card, Apple Pay, Zip, Afterpay); an Order model + history; and a consistent `object-contain` image-frame treatment everywhere. Payments are simulated (user-confirmed decision) — no Stripe.

**Confirmed decisions:** simulated payments · login required at checkout (guests can browse/add to cart) · full multi-page with react-router v6 · Framer Motion · keep/evolve the existing warm terracotta design language (Inter + DM Serif Display).

**Locked-in technical choices (do not re-decide):**
- JWT in localStorage (`annz_token`) + axios `Authorization: Bearer` interceptor.
- Single `User` model with `role: 'customer'|'admin'`; delete the `Admin` model and `routes/admin.js`; admins log in through the same login page.
- Guest cart = localStorage snapshot (`annz_guest_cart`), merged into the server cart via `POST /api/cart/merge` on login/register.
- Tax becomes server-owned: `GET /api/config` → `{ taxRate }` (env `TAX_RATE`, default 0.1); order totals computed server-side.
- Decline test card `4000 0000 0000 0002` → HTTP 402; anything else succeeds after a 1.2–1.8s simulated delay.

---

## Phase 1 — Server: auth foundation + critical fixes

Install in `server/`: `npm i bcryptjs jsonwebtoken && npm i -D nodemon`. Scripts: `"dev": "nodemon src/index.js"`, add `"start": "node src/index.js"`.

**Create:**
- `server/src/models/User.js` — `{ name (req, ≤80), email (req, unique, lowercase), password (req, select:false), role (enum customer|admin, default customer) }`, timestamps. `pre('save')` bcrypt-hash (10 rounds) when modified; instance method `comparePassword`.
- `server/src/middleware/auth.js` — `requireAuth` (verify `Bearer` JWT with `JWT_SECRET`, load user onto `req.user`, else 401) and `requireAdmin` (requireAuth + role check, else 403).
- `server/src/routes/auth.js`:
  - `POST /api/auth/register` — `{name, email, password(min 6)}` via express-validator; 409 on duplicate email; 201 `{ token, user: {id, name, email, role} }`. JWT payload `{ sub, role }`, expiry 7d.
  - `POST /api/auth/login` — `{email, password}` → same shape; 401 on mismatch.
  - `GET /api/auth/me` — requireAuth → `{ user }`.

**Modify:**
- `server/src/routes/products.js` — add `GET /:id` (public, 404 if missing — **doesn't exist today**, needed for detail page); protect `POST`/`PUT`/`DELETE` with `requireAdmin`.
- `server/src/routes/cart.js:51` — **fix bug** `if (product.stock = 0)` (assignment) → `if (product.stock <= 0)`.
- `server/src/index.js` — mount `/api/auth`; remove admin routes; add `GET /api/config` → `{ taxRate: Number(process.env.TAX_RATE ?? 0.1), currency: 'USD' }`; exit with a clear error at startup if `JWT_SECRET` is missing.
- `server/src/seed.js` — replace Admin seeding with `User.create({ name:'Ann', email:'admin@annzbricks.com', password:'12345@', role:'admin' })`; also clear Users/CartItems on reset.
- `server/.env` — add `JWT_SECRET=<random 32+ chars>`, `TAX_RATE=0.1`. `.env.example` — mirror keys, fix `PORT=5001`→`5005` (Vite proxies to 5005).
- **Delete** `server/src/models/Admin.js`, `server/src/routes/admin.js`.

**Verify:** `npm run seed`; curl register→201 with token; login admin→role admin; `/api/auth/me` with/without token → 200/401; `POST /api/products` without token→401, with admin token→201; password stored as `$2a$…` hash.

## Phase 2 — Server: per-user cart, Order model, simulated payment

- `server/src/models/CartItem.js` — add `userId (ObjectId ref User, required, index)`; compound unique index `{userId, productId}`; drop redundant `addedAt`.
- `server/src/routes/cart.js` — full rewrite, all routes `requireAuth`, all queries scoped `{ userId: req.user._id }`:
  - `GET /` populated items (keep stale-product cleanup) · `POST /` upsert-increment, reject when stock ≤ 0 or requested > stock (400 with available count) · `PUT /:id`, `DELETE /:id` must match userId else 404.
  - `POST /merge` `{ items: [{productId, quantity}] }` — skip unknown products, clamp qty to stock, increment existing rows, return populated cart. (Called by client after login/register.)
  - **Remove** `POST /checkout`.
- `server/src/models/Order.js` — `{ orderNumber (unique, e.g. 'AB-' + Date.now().toString(36).toUpperCase() + 2 random letters), userId (indexed), items: [{productId, name, price, imageUrl, quantity}] (price/name snapshot at purchase), subtotal, taxRate, tax, total, shippingAddress {fullName, line1, line2, city, state, postcode, country (default Australia), phone}, payment { method (enum card|applepay|zip|afterpay), status (enum ['paid']), cardBrand, last4 }, status (enum processing|shipped|delivered, default processing) }`, timestamps. **Never store full card number or CVC.**
- `server/src/routes/orders.js`:
  - `POST /api/orders` — requireAuth. Body `{ shippingAddress, payment: { method, card?: { number, expiry, name } } }` (client never sends CVC). Flow: load user cart → 400 if empty → validate address (express-validator) → simulated delay `1200 + Math.random()*600` ms → if card number digits === `4000000000000002` → **402** `{ message: 'Your card was declined.', code: 'card_declined' }` → atomic per-item decrement `Product.findOneAndUpdate({_id, stock:{$gte:qty}}, {$inc:{stock:-qty}})`; on any null, best-effort re-increment the already-decremented ones and **409** `Not enough stock for "<name>"` → compute subtotal from **live DB prices**, tax, total → create Order (derive last4/brand from number, discard it) → `CartItem.deleteMany({userId})` → **201** `{ order }`.
  - `GET /api/orders` — own orders, newest first. `GET /api/orders/:id` — own order (or admin), else 404.
- Mount `/api/orders` in `server/src/index.js`.

**Verify (curl):** decline card → 402, cart intact, stock unchanged; `4242 4242 4242 4242` → 201 with orderNumber after ~1.5s, stock decremented, cart empty, order listed; second user's cart isolated; over-stock qty → 409.

## Phase 3 — Client foundation: router, contexts, auth pages, guest cart

Install in `client/`: `npm i react-router-dom@^6.26 framer-motion@^11`.

**New structure** (dismantle the `App.jsx` god-context):
```
client/src/
  main.jsx                        # BrowserRouter > ToastProvider > AuthProvider > CartProvider > App
  App.jsx                         # <Routes> only
  context/{ToastContext,AuthContext,CartContext}.jsx
  components/layout/{RootLayout,Navbar}.jsx
  components/guards.jsx           # RequireAuth, RequireAdmin (Outlet-based)
  components/motion/{PageTransition.jsx,variants.js}
  pages/{CataloguePage,LoginPage,RegisterPage,AdminPage,NotFoundPage}.jsx
  services/api.js                 # + interceptors + new endpoint fns
```
Routes: `/` catalogue · `/products/:id` (Phase 4) · `/login`, `/register` · under `RequireAuth`: `/checkout`, `/orders`, `/orders/:id/confirmation` (Phase 5) · under `RequireAdmin`: `/admin` · `*` NotFound. Delete `AdminLogin.jsx` (login page replaces it); `AdminPage` wraps existing `AdminPanel` with CRUD handlers moved inside it (api + toast directly).

**Key mechanics:**
- `services/api.js`: request interceptor attaches Bearer token; response interceptor on 401 (non-`/auth/` URLs) clears token and redirects to `/login`. Add `register, login, me, mergeCart, fetchProduct, createOrder, fetchOrders, fetchOrder, fetchConfig`; remove `checkout, adminLogin`.
- `AuthContext`: `{ user, initializing, login, register, logout }`; on mount, token → `me()`.
- `CartContext` dual mode, one normalized item shape `{_id, productId, name, price, imageUrl, stock, quantity}`: guest → localStorage snapshots; logged in → server API. `useEffect` on `user` becoming non-null: if guest cart non-empty → `POST /api/cart/merge` → clear `annz_guest_cart` → load server cart. Logout resets to empty guest mode.
- `RequireAuth`: spinner while `initializing`; else `<Navigate to="/login" state={{from}}/>`; LoginPage navigates back to `state.from ?? '/'`.
- `RootLayout` page transitions: `useLocation()` + `useOutlet()`, `<AnimatePresence mode="wait" initial={false}>` around `motion.main key={location.pathname}` — enter `{opacity:0→1, y:12→0, .25s}`, exit `{opacity→0, y→-8, .18s}`.
- `CartDrawer` rewrite: replace CSS `cart-enter/exit` with `AnimatePresence` — backdrop fade; panel `motion.aside x:'100%'↔0`, spring `{damping:30, stiffness:300}`; line items `motion.div layout` with exit `{opacity:0, x:40, height:0}`. Checkout button → `navigate('/checkout')` (RequireAuth handles the login gate). Summary shows subtotal + "Taxes calculated at checkout" (drop the hard-coded 10%).
- `Navbar`: logo `Link to="/"`; NavLinks Shop / Orders (auth) / Admin (admin role); cart button + account area ("Hi, {name}" + logout, or Sign in). Badge pops on count change: `motion.span key={cartCount}` spring scale.
- Login/Register pages: centered `card` max-w-sm, DM Serif heading, existing `.input-field`/`.btn-primary` classes, error banner, cross-links, submit spinner.
- Move the minifig-pile background image off `body` (RootLayout uses plain `bg-bg`); it returns as the home hero in Phase 4.

**Verify:** guest browse/filter/add-to-cart persists across reload; register → guest cart merges into server cart; admin login → `/admin` CRUD fully works; deep-link `/admin` as guest → login redirect then back; page transitions animate.

## Phase 4 — Image treatment, product detail page, home hero

- **Create `client/src/components/ProductImage.jsx`** — the single image primitive used everywhere: outer `div relative overflow-hidden rounded-card bg-bg-alt` + fixed aspect (`aspect-square` default, `aspect-[4/3]` option) + padding (default `p-6`); inner `img w-full h-full object-contain`, `loading="lazy"` (eager opt-in), `onError` → existing placeholder SVG. Fixed aspect ⇒ zero layout shift ("not resizable"). When explicit `w-/h-` classes are passed (thumbnails), skip the aspect class.
- Apply everywhere: `ProductCard` (aspect-square `p-6`, replaces `aspect-[4/3] object-cover`; keep Sold Out overlay + low-stock badge as absolute children), `CartDrawer` rows (`w-16 h-16 p-1.5`), `AdminPanel` thumbnails (~lines 93/187, `w-10 h-10 p-1`), detail page, order rows.
- **Create `client/src/pages/ProductDetailPage.jsx`** (`/products/:id`): fetch via `fetchProduct(id)`, skeleton + not-found states. 2-col `lg:grid-cols-2 gap-10`: left = ProductImage aspect-square `p-10` in a card; right = breadcrumb, DM Serif `text-4xl` name, price, stock line, description, category badge, quantity stepper (clamped to stock), full-width Add to cart with spinner-then-check. Motion: image slides in from left, info column staggers (`staggerChildren 0.06`). (Optional stretch: `layoutId` card→detail image morph — skip if flaky with `mode="wait"`.)
- `ProductCard` becomes a `Link` to detail (whole card clickable; Add-to-cart button stops propagation).
- **`CataloguePage` hero:** full-bleed band using `/images/Minifigure%20Heads%20-%20Pile%20-%20Desktop%20widescreeen.png` as cover background + warm gradient overlay (`from-bg via-bg/70 to-transparent`), DM Serif `text-5xl` "Annz Bricks", tagline, "Shop the collection" button scrolling to grid; text stagger-reveals on mount.

**Verify:** every surface shows the full uncropped PNG on the neutral frame; mixed aspect ratios never shift layout; broken URL → fallback icon; card → detail → add qty>1 to cart works.

## Phase 5 — Checkout flow, confirmation, order history

- `client/src/utils/payment.js` — `luhnCheck`, `formatCardNumber` (groups of 4), `detectBrand` (Visa `^4`, MC `^5[1-5]`, Amex `^3[47]`), `formatExpiry` (auto `/`), `validateExpiry` (MM/YY, future), CVC 3–4 digits.
- `client/src/pages/CheckoutPage.jsx` — `useReducer` state machine:
  `{ step: 'shipping'|'payment'|'review', direction: 1|-1, shipping {…}, payment { method: 'card'|'applepay'|'zip'|'afterpay', card {number, expiry, cvc, name} }, errors, submitting, submitError }`; actions `SET_FIELD, NEXT (validates current step), BACK, SET_METHOD, SUBMIT_START/FAIL`. Redirect to `/` if cart empty (unless just submitted). Layout: left = step panel; right = sticky order summary card (ProductImage `w-12 h-12 p-1` thumbs, subtotal, tax from `fetchConfig`, total). Step indicator: 3 dots+labels, active underline moves via `layoutId="step-indicator"`. Step transitions: `AnimatePresence mode="wait"`, direction-aware variants (`custom={direction}`, enter from `x: 40*dir`, exit to `x: -40*dir`, 0.22s).
- `components/checkout/ShippingStep.jsx` — address form; per-field validation on NEXT (required except line2/phone; postcode 4 digits).
- `components/checkout/PaymentStep.jsx` — 4 radio-cards (Card / Apple Pay / Zip / Afterpay); selected = `border-accent bg-accent-light`, `whileTap scale .98`, selection ring via `layoutId="method-ring"`.
  - Card: formatted number (Luhn on NEXT, inline brand icon), expiry, CVC, name; helper text "Test decline: 4000 0000 0000 0002".
  - Apple Pay: black rounded ` Pay` button (SVG glyph), skips card fields.
  - Zip / Afterpay: branded tile + "4 interest-free payments of ${(total/4).toFixed(2)}".
- `components/checkout/ReviewStep.jsx` — address summary (edit → BACK), method summary (brand + last4), items, totals, "Place order".
  - Submit theatrics: `applepay` → simulated bottom sheet (slides up, scrim, total + confirm → 1.5s spinner → animated check) then API; `zip`/`afterpay` → "Redirecting to {provider}…" modal 1.5s → "Approved ✓" → API; `card` → button spinner "Processing payment…".
  - API `createOrder({ shippingAddress, payment: { method, card: method==='card' ? {number, expiry, name} : undefined } })` — **no CVC sent**. 402 → error banner with shake (`x: [0,-8,8,-5,5,0]`), stay on review. 201 → `navigate('/orders/:id/confirmation', {state:{order}})`, cart reloads (empty).
- `pages/OrderConfirmationPage.jsx` — animated checkmark (`motion.path pathLength 0→1`, circle scales in first), "Order placed!", orderNumber badge, staggered reveal of items / totals / address / payment summary, "Continue shopping" + "View my orders".
- `pages/OrdersPage.jsx` — card rows newest-first: orderNumber, date, status badge, total, overlapping first-3 thumbnails "+N"; expandable (`motion.div height:'auto'`) full detail; empty state with CTA; stagger on mount.

**Verify (full manual run):** guest with items → Checkout → login gate → login (cart merges) → back on /checkout → invalid postcode blocked → decline card → ~1.5s then declined banner + shake, cart intact → `4242…` → confirmation with checkmark draw + order number → drawer empty, stock reduced, order in /orders. Repeat once with Apple Pay sheet, once with Zip modal.

## Phase 6 — Animation & UI polish pass

Shared variants in `components/motion/variants.js`:
- **Grid stagger** (CataloguePage): container `staggerChildren 0.05, delayChildren 0.08`; `ProductCard` = `motion(Link)`, child variant `{opacity:0, y:20, scale:.98}→{opacity:1, y:0, scale:1, .35s easeOut}` + `layout` prop + `<AnimatePresence mode="popLayout">` around mapped cards so filter/search animates reflow and exits. Remove old `anim-up` usage.
- **Micro-interactions:** cards `whileHover={{y:-4}}`; primary buttons `whileTap={{scale:.97}}`; category chips: `layoutId="chip-active"` pill slides behind the active chip.
- **Toasts:** `AnimatePresence` + `layout`; enter `{opacity:0, y:16, scale:.95}`, exit `{opacity:0, x:24}`.
- **Add-to-cart button** morphs label → spinner → checkmark for 800ms (`AnimatePresence mode="wait"`).
- **Reduced motion:** `usePageVariants()` hook returns opacity-only variants when `useReducedMotion()` is true; apply to page transitions + grid.
- **CSS cleanup** in `index.css`: delete now-unused `slideRight`, `slideRightOut`, `cart-enter/exit`, `anim-up`; keep the `@layer components` classes.

**Verify:** category filtering reflows smoothly; all route transitions clean; drawer spring; toasts stack/depart; macOS "Reduce Motion" → fades only.

## Phase 7 — Maintenance, config, docs

- `server/.env.example`: `MONGODB_URI`, `PORT=5005`, `JWT_SECRET=change-me`, `TAX_RATE=0.1`.
- `README.md`: fix port 5001→5005; document new endpoints, admin credentials (`admin@annzbricks.com` / `12345@`), test cards (4242… success / 4000…0002 decline), JWT-in-localStorage note, updated file tree, nodemon dev flow. Note: `server/.env` is **not** tracked in git (verified), but rotate the Atlas password anyway as hygiene since the URI has lived on dev machines.
- Optional: rename `shopflow*` package names → `annz-bricks*`.
- Dead-code sweep: `grep -r "adminLogin\|/api/admin\|cart/checkout" client server` must return nothing.

**Verify:** fresh-clone simulation — `npm run install-all`, copy `.env.example` + fill, `npm run seed`, `npm run dev`, smoke-test Phases 1–6 checklists.

---

## Risks / trade-offs (accepted)

- **Phase 3 is the big-bang refactor** (god-context → 3 contexts + router). Mitigated by keeping AdminPanel/ProductModal internals nearly unchanged and putting admin CRUD in that phase's verification checklist.
- Guest-cart snapshots can go stale (price/stock) — server re-validates at merge and at order time; Order always uses live DB prices.
- Stock rollback on partial decrement failure is best-effort, not transactional (fine at this scale; note in a code comment).
- localStorage JWT is XSS-exposed vs httpOnly cookie — chosen for simplicity, documented in README.
- Admin login switches from username `truonganvu` to email — documented; seed the old name as the email local-part if needed.

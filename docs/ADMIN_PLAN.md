# Annz Bricks — Admin Section Build-Out

## Context

The store overhaul (auth, checkout, orders, UI) is implemented and verified, but the admin area is still just the original product table: `/admin` → `AdminPage` → `AdminPanel` (product CRUD + inline stock edit). Admins have no visibility into orders, revenue, or customers, and no way to progress or cancel an order. This plan turns `/admin` into a real admin section: dashboard, order management with status flow + cancellation (stock restore), upgraded product table, and customer management.

**Confirmed scope:** all four features (dashboard, orders, product upgrades, customers) · nested routes + sidebar (`AdminLayout`) · order cancellation restores stock, only from `processing` · the dashboard is a full **sales report** (period toggle, revenue hero + deltas, category-breakdown donut, revenue-over-time chart, top products, insight accordions — modeled on the NRMA quote-breakdown reference the user supplied).

**Hard constraints (learned during the overhaul — do not violate):**
- NO framer-motion `layout` prop, `layoutId`, or `AnimatePresence mode="popLayout"` in routed pages — they deadlock RootLayout's `mode="wait"` page transition. Active chips/pills use plain CSS transitions. AnimatePresence for expanding rows/modals is fine (see `pages/OrdersPage.jsx`).
- Route guards keep their imperative useEffect+navigate redirects (`components/guards.jsx`) — never `<Navigate>`.
- All product thumbnails use `components/ProductImage.jsx`. Reuse `motion/variants.js` (staggerContainer/staggerItem), `useToast`, the `validate` express-validator helper pattern, and the two-click-confirm pattern from AdminPanel's delete button.

**Decisions locked in:** stats via `Promise.all` of simple queries + one `Order.aggregate` for revenue · customers via one `User.aggregate` with `$lookup` sub-pipeline (**explicit `$project` — aggregate bypasses `select:false`, without it the password hash leaks**) · status flips atomic via `findOneAndUpdate({_id, status: REQUIRED_FROM[target]})`, stock restore only after a successful flip · orders/customers filter+search client-side (small dataset) · admin orders page mirrors the customer OrdersPage card-list + expandable-height pattern (not a `<table>`) · new pages in `client/src/pages/admin/`, shared badge styles in new `client/src/utils/orderStatus.js`.

---

## Phase 1 — Server: Order model + `routes/admin.js`

- **`server/src/models/Order.js`** — status enum → `['processing','shipped','delivered','cancelled']` (backward-compatible, no migration).
- **Create `server/src/routes/admin.js`** — `router.use(requireAdmin)` (array middleware works with `use`), copy the `validate` helper from `routes/products.js`. Six endpoints:
  1. `GET /api/admin/stats` — `Promise.all`: revenue `Order.aggregate([{$match:{status:{$ne:'cancelled'}}},{$group:{_id:null,total:{$sum:'$total'}}}])` (respond `revenueAgg[0]?.total ?? 0` — empty-DB safe), `Order.countDocuments()`, `Order.countDocuments({status:'processing'})`, `Product.countDocuments()`, `User.countDocuments({role:'customer'})`, low stock `Product.find({stock:{$lte:3}}).sort({stock:1}).limit(10).select('name imageUrl stock category')`, recent `Order.find().sort({createdAt:-1}).limit(5).populate('userId','name email')`. Response `{ revenue, orderCount, processingCount, productCount, customerCount, lowStock, recentOrders }`.
  2. `GET /api/admin/orders` — all orders newest-first, `.populate('userId','name email')` (may be null if user deleted).
  3. `PATCH /api/admin/orders/:id/status` — body `{status}` ∈ shipped|delivered|cancelled. Transition map `REQUIRED_FROM = { shipped:'processing', cancelled:'processing', delivered:'shipped' }`; atomic `Order.findOneAndUpdate({_id, status: REQUIRED_FROM[status]}, {status}, {new:true}).populate('userId','name email')`; on null → 404 if order missing else 400 `Cannot change status from 'X' to 'Y'`. If cancelled: per-item `Product.findByIdAndUpdate(item.productId, {$inc:{stock:item.quantity}})` (skip null productIds). Restore-after-flip means a concurrent double-cancel gets 400, never a double restore.
  4. `GET /api/admin/customers` — `User.aggregate`: `$lookup` from `orders` (sub-pipeline `$match` userId + `status:{$ne:'cancelled'}`, `$group` count/spent) → `$addFields` orderCount/totalSpent with `$ifNull` 0 → **`$project: {name:1,email:1,role:1,createdAt:1,orderCount:1,totalSpent:1}`** → `$sort createdAt desc`.
  5. `PATCH /api/admin/customers/:id/role` — body `{role}` ∈ customer|admin. Guard first: `req.params.id === String(req.user._id)` → 400 "You cannot change your own role". Then `findByIdAndUpdate(...).select('name email role createdAt')`, 404 if missing.
  6. `GET /api/admin/images` — `fs.promises.readdir(path.join(__dirname,'../../../images'), {withFileTypes:true})`; for each subdirectory (sorted) list image files (ext ∈ .png/.jpg/.jpeg/.webp/.gif), URL `'/images/' + segments.map(encodeURIComponent).join('/')`; root-level images go in a final "Other" group. Response `{ groups: [{folder, files:[{name,url}]}] }`. One level deep; no user input in paths; `ENOENT` → `{groups:[]}`.
  7. `GET /api/admin/sales-report?period=week|month|year` (default `month`) — the sales-report data source. Windows: `week` = last 7 days (daily buckets), `month` = last 30 days (daily), `year` = last 12 months (monthly). Every aggregation excludes cancelled orders and is bounded by `createdAt: { $gte: windowStart }`. Also run the summary aggregation for the **immediately preceding window of equal length** so the client can render deltas.
     - `summary`: `{ revenue, orders, units, avgOrder, prev: { revenue, orders, units, avgOrder } }` — revenue/orders via one `$group` ($sum '$total', $sum 1); units via `$unwind '$items'` → `$sum '$items.quantity'`; `avgOrder = orders ? revenue/orders : 0`.
     - `timeseries`: `$group` by `$dateTrunc: { date: '$createdAt', unit: 'day' | 'month' }` → `{ revenue, orders }`, then **fill empty buckets with zeros in JS** so the axis is continuous. Return `[{ date: ISO string, revenue, orders }]`.
     - `byCategory`: `$unwind '$items'` → `$lookup` products on `items.productId` → category (`$ifNull` → `'Other'` for deleted products) → `$group` per category `{ revenue: $sum (price×quantity), units: $sum quantity }` → sort revenue desc.
     - `topProducts`: `$unwind '$items'` → `$group` by `items.productId` with `$first` name/imageUrl (they're snapshotted on the item) → `{ revenue, units }` → sort revenue desc, limit 5.
     - Response: `{ period, summary, timeseries, byCategory, topProducts }`.
- **`server/src/index.js`** — mount `app.use('/api/admin', require('./routes/admin'))`.

**Verify (curl, admin token from `POST /api/auth/login`):** stats returns numbers + arrays; orders have populated userId; images returns 6 encoded groups; **customers response contains NO password field**; no token → 401, customer token → 403; `delivered` from `processing` → 400; `cancelled` → 200 then product stock re-incremented (`GET /api/products/:id` before/after); re-cancel → 400; self role change → 400. Sales report: `?period=week` returns exactly 7 timeseries buckets (zeros filled), `byCategory` revenues sum ≈ `summary.revenue`, cancelled orders excluded (cancel one, re-fetch, revenue drops), `?period=bogus` falls back to month (or 400 — pick one and be consistent).

## Phase 2 — Client: API fns, AdminLayout, nested routes

- **`client/src/services/api.js`** — add: `fetchAdminStats`, `fetchAdminSalesReport(period)` (`api.get('/admin/sales-report', { params: { period } })`), `fetchAdminOrders`, `updateOrderStatus(id,status)` (PATCH), `fetchAdminCustomers`, `updateCustomerRole(id,role)` (PATCH), `fetchAdminImages`.
- **Create `client/src/components/admin/AdminLayout.jsx`** — `md:grid md:grid-cols-[190px,1fr] md:gap-8 md:items-start`; desktop `<aside className="hidden md:block sticky top-20">` with `font-heading` "Admin" title + NavLinks (Dashboard `end`, Orders, Products, Customers; active = `bg-ink text-white`, inactive = `text-ink-light hover:bg-bg-alt`, `transition-all duration-200`); mobile horizontal scrollable tab bar (`md:hidden flex gap-1.5 overflow-x-auto`); content `<div className="min-w-0"><Outlet/></div>`. Bare `Outlet`, CSS-only active states.
- **`client/src/App.jsx`** — under existing `RequireAdmin`: `admin` → `AdminLayout` with `index` = AdminDashboardPage, `orders`, `products`, `customers`.
- **Create `client/src/pages/admin/AdminProductsPage.jsx`** = current `AdminPanel.jsx` contents moved (imports become `../../`); stubs for Dashboard/Orders/Customers pages. **Delete** `pages/AdminPage.jsx` + `components/AdminPanel.jsx`. Navbar unchanged (Admin link → `/admin` = dashboard).

**Verify:** admin login → sidebar + all four routes render; products page fully functional after the move (stock edit, delete, modal); customer deep-link `/admin/orders` → redirected to `/`, no loop; mobile tab bar at narrow width.

## Phase 3 — Sales-report dashboard

Layout modeled on the NRMA quote-breakdown reference: headline figure + period toggle, a breakdown donut with hover tooltips and click-to-pin explanation row, and expandable insight/warning accordions.

- **Create `client/src/utils/orderStatus.js`** — `STATUS_STYLES = { processing:'bg-accent-light text-accent', shipped:'bg-blue-50 text-blue-700', delivered:'bg-green-50 text-green-700', cancelled:'bg-danger-light text-danger' }`.
- **Create `client/src/utils/chartColors.js`** — the chart palette + assignment rule (see "Chart rules" below).
- **`pages/admin/AdminDashboardPage.jsx`** — state: `stats` (fetched once), `report`, `period` (`'month'` default), `loading`, `pinnedCategory`. `useEffect` on `period` → `fetchAdminSalesReport(period)`. Pulse skeletons while loading; error state with retry; toast on failure.

**Header row:** `font-heading` h1 "Dashboard" + period toggle on the right — three pills **Week / Month / Year** (exact chip pattern from CataloguePage: active `bg-ink text-white`, CSS `transition-all duration-200`, no layoutId).

**Row 1 — revenue hero + KPI tiles:**
- Hero card (`.card p-6`, spans full width or 2 cols): uppercase `text-xs text-ink-faint` label "Revenue · last 30 days" (text tracks the period) → hero figure `text-5xl font-semibold` in **Inter (not font-heading — big numbers read best in the UI sans)**, `$X,XXX.XX` via `toLocaleString` 2dp → delta line: `↑ 12.4% vs previous 30 days` — arrow SVG + text in `text-success` when up / `text-danger` when down (icon + text together, never color alone; `— no change` when prev is 0 and current is 0; when prev is 0 and current > 0 show "new" instead of a percentage).
- Three stat tiles beside/below it (`grid grid-cols-3 gap-4`): **Orders**, **Units sold**, **Avg order value** — each `.card p-4`: label, `text-2xl font-semibold` value (`tabular-nums`), small delta line vs `summary.prev` (same arrow treatment).
- Second tile row from `stats` (all-time): **Products**, **Customers**, **Awaiting shipment** (`processingCount`, card links to `/admin/orders`). Wrap tile grids in `staggerContainer`/`staggerItem`.

**Row 2 — "How your revenue breaks down" (donut + legend + pinned detail):**
- Card title + hint line: "Hover a segment to see its share. Click to pin details." (mirrors the reference).
- **Hand-rolled SVG donut** (no chart library): `viewBox="0 0 200 200"`, ring radius 80, stroke-width 26. Each category in `byCategory` is one arc — either `<circle>` with computed `stroke-dasharray`/`stroke-dashoffset` (circumference = 2π·80) or `<path>` arcs. Leave a **2px surface gap between segments** (subtract a fixed gap angle per segment, or overlay 2px white separators). Center: uppercase `text-[10px] text-ink-faint` "TOTAL" + the period revenue in `text-xl font-semibold tabular-nums`.
- **Hover:** on segment mouseenter, thicken that arc's stroke-width to 30 (CSS transition) and show an absolutely-positioned tooltip div (`.card` styling, `pointer-events-none`) with: color chip, category name, `$revenue`, `NN.N% share`, `N units`. Full-ring invisible hover targets are not needed — the 26px stroke is its own generous hit area.
- **Click** a segment or legend row → sets `pinnedCategory`; render a **pinned detail row** under the donut (the reference's "Building cover base · +$1296" row): color chip + category name + `badge` "Top seller: {name of that category's highest-revenue product, if derivable from topProducts, else omit}" + right-aligned `+$revenue`, and a one-line `text-sm text-ink-light` description: "N units sold across this category in the selected period." Click again (or ✕) to unpin.
- **Legend** (right of donut on `lg`, below on mobile): one row per category — 10px rounded color chip, category name in `text-ink`, `$revenue` + `%` in `text-ink-light tabular-nums`. **The legend with visible values is mandatory** (three palette slots are sub-3:1 contrast on white — the validator's relief rule).
- Empty state: "No sales in this period."

**Row 3 — "Revenue over time" (column chart):**
- Hand-rolled SVG column chart, height ~220, responsive width (viewBox + container measurement or `preserveAspectRatio="none"` on an inner group). One series → **no legend** (the card title names it).
- Columns: single hue `#2a78d6`, thin marks with a 2px gap between adjacent bars, **4px rounded top corners only** (data ends; flat at the baseline). Hover: bar deepens to `#1c5cab` + tooltip (date, `$revenue`, `N orders`); give each bucket an invisible full-height hover rect so the target is bigger than the mark.
- Axes: hairline baseline `#e8e5e0`; 3–4 horizontal gridlines with muted `$` labels (`text-ink-faint`, `tabular-nums`, formatted `$1.2k` style); x labels — week: day names, month: every ~5th date, year: month initials. No axis on top/right; no dual axis.
- Zero-revenue buckets render as an empty slot on a continuous axis (the server already fills them).

**Row 4 — top products, insights, recent orders (`lg:grid-cols-2 gap-5`):**
- **Top products** card: 5 rows — `ProductImage w-9 h-9 p-1` thumb, name (`truncate`), `N units` in `text-ink-faint`, `$revenue` right-aligned; behind each row a subtle horizontal magnitude bar (`bg-[#cde2fb]` — the sequential hue's lightest step, NOT a categorical color) scaled to the max revenue in the list. Footer link "Manage products →".
- **Insights** card (the reference's warning accordions): expandable rows, each `border border-border rounded-card` with a warning triangle SVG in `text-yellow-600` + label (icon + text, never color alone) + chevron; expand/collapse via `AnimatePresence` + `motion.div height 0→'auto'` (the allowed pattern):
  - "{n} products low on stock" → expands to the `stats.lowStock` rows (ProductImage + name + stock badge) + "Manage products →" link.
  - "{n} orders awaiting shipment" → expands to a one-liner + "View orders →" link to `/admin/orders`.
  - "{n} products sold out" (subset of lowStock with stock 0) → same pattern.
  - Rows with a zero count are hidden; if all are zero show a single `text-success` "✓ All clear — no action needed."
- **Recent orders** card (from `stats.recentOrders`): mono orderNumber, `userId?.name ?? 'Unknown customer'`, date, STATUS_STYLES badge, total; footer link to `/admin/orders`.

### Chart rules (bake into `utils/chartColors.js` + both charts)

- **Palette (validated):** 8 categorical slots in this fixed order — `#2a78d6` blue, `#1baf7a` aqua, `#eda100` yellow, `#008300` green, `#4a3aa7` violet, `#e34948` red, `#e87ba4` magenta, `#eb6834` orange. Validated against the white card surface: worst adjacent CVD ΔE 24.2 (PASS, target ≥12); aqua/yellow/magenta are below 3:1 contrast → the visible legend values are required, already in the spec.
- **Assignment is by entity, never by rank:** sort category names alphabetically and assign slots 1→N in that fixed order (`assignCategoryColors(categories)` returns a `Map`). Colors must NOT repaint when the period toggle changes the ordering or a category drops out. More than 8 categories → keep the 7 largest by all-time convention (alphabetical assignment still), fold the rest into "Other" in neutral `#a3a3a3` (ink-faint).
- **Text wears ink tokens, never series colors** — legend names, values, tooltips all use `text-ink`/`text-ink-light`; only the chip/arc carries the hue.
- **One axis** per chart; single-series charts get **no legend**; the donut always gets its legend.
- Tooltips are plain absolutely-positioned divs; hover states are CSS — **no framer-motion `layout`/`layoutId` anywhere in the charts** (session constraint).
- Numbers that align vertically (legend values, axis ticks, tile values) get `tabular-nums`.

**Verify:** place several orders across different categories (and ideally nudge a couple of `createdAt` values in Mongo to spread days); `/admin` → donut segment values sum to the hero revenue; period toggle Week/Month/Year changes figures + deltas and the timeseries bucket count (7/30/12); category colors stay identical across periods; hover tooltips on donut + columns; click pins/unpins the detail row; cancel an order → revenue and its category segment shrink; low-stock and awaiting-shipment accordions expand with correct counts and links; empty-period state renders (pick Week with no recent orders).

## Phase 4 — Admin Orders page + cancelled badge for customers

- **`pages/OrdersPage.jsx`** — delete local STATUS_STYLES, import from `../utils/orderStatus` (customer page gains the cancelled style).
- **`pages/admin/AdminOrdersPage.jsx`** — state: orders, loading, statusFilter `'all'`, search, expandedId, confirmCancelId, updatingId.
  - Filter chips `['all','processing','shipped','delivered','cancelled']` with live counts (CataloguePage chip classes, CSS transitions) + search input (order # / customer name / email, `useMemo` filter).
  - Card list mirroring customer OrdersPage: header `<button aria-expanded>` (mono orderNumber, date + item count, customer name/email — `userId?.name ?? 'Unknown customer'`, status badge, total, rotating chevron `motion.svg`); expanded detail via `AnimatePresence` + `motion.div height 0→'auto'` (items with ProductImage thumbs, address, payment method + last4, totals) **plus an actions footer** (actions must not nest inside the header button): `processing` → "Mark shipped" (`btn-secondary !py-1.5 text-xs`) + "Cancel order" (two-click confirm, AdminPanel pattern, confirmed = `bg-danger text-white`); `shipped` → "Mark delivered"; else "No actions available".
  - `changeStatus(order, status)`: `updateOrderStatus` → replace row in state from the populated response (no refetch) → toast (`'Order cancelled — stock restored'` / `'Order marked shipped'`); 400/error → error toast with server message; disable buttons while `updatingId`.
  - Empty states: none at all vs "No orders match" + clear filters.

**Verify:** all users' orders listed; chips + search work; processing → shipped → delivered flow updates badges in place; cancel with two clicks → stock visibly restored on `/admin/products`; cancelled order shows red badge on the customer's own `/orders`.

## Phase 5 — Products page upgrades + image picker

- **`pages/admin/AdminProductsPage.jsx`** — add toolbar: category chips (`['All', ...categories]`) + name search (CataloguePage styles). Derived `visible` list via `useMemo` (filter then sort). Sortable headers Product/Price/Stock: `<button>` in `<th>` toggling `{key, dir}` (`name` → localeCompare, others numeric), inline chevron svg per dir, CSS-only. Desktop table AND mobile list both map `visible`. "No products match" empty state.
- **Create `components/admin/ImagePicker.jsx`** — props `{ value, onChange }`. Mount → `fetchAdminImages()`. Always-visible live preview on top (`ProductImage aspect="4/3" padding="p-2"` — built-in fallback covers empty/broken). Mode pills "Gallery"/"Custom URL" (initial mode: `custom` if `value && !value.startsWith('/images/')`). Gallery: `max-h-56 overflow-y-auto`, per-group folder label + `grid grid-cols-4 gap-1.5` of `<button type="button">` thumbnails (`ProductImage padding="p-1"`, selected = `ring-2 ring-accent`). Custom: free-text input — **must be `type="text"`**, `type="url"` rejects relative `/images/...` paths. Gallery-load error → inline note, custom tab still works.
- **`components/ProductModal.jsx`** — remove `imageUrl` from the `fields` array; render `<ImagePicker value={form.imageUrl} onChange={...}/>` (clears the imageUrl error on change) after category; widen `max-w-md` → `max-w-lg`.

**Verify:** search/chips/sort on both desktop table and mobile list; Add product → grouped gallery, thumbnail click selects with ring + preview; saved product renders in catalogue (encoded URL works); editing an external-URL product opens on Custom tab with the URL intact.

## Phase 6 — Customers page

- **`pages/admin/AdminCustomersPage.jsx`** — fetch `fetchAdminCustomers()`; `const { user: me } = useAuth()` (self id is `me.id`, rows use `_id`). Desktop table: Name | Email | Role badge (admin `bg-accent-light text-accent`, customer `bg-bg-alt text-ink-light border border-border`) | Joined (toLocaleDateString) | Orders | Spent (`toFixed(2)`) | Actions; mobile stacked cards. Own row (`c._id === me.id`) → "You" text, no button. Otherwise "Make admin"/"Make customer" with two-click confirm; on success merge only `role` into the row (PATCH response lacks orderCount/totalSpent) + toast.

**Verify:** counts/spend match the orders page (cancelled excluded); own row shows "You"; promote a customer → their login shows the Admin nav link; demote back; curl self-demote → 400.

---

## Risks / gotchas

- **Password leak via aggregate** is the sharpest edge: the `$project` whitelist in `/api/admin/customers` is load-bearing (`select:false` doesn't apply to aggregate). Curl-verify in Phase 1.
- Cancel race handled by the atomic status precondition; per-item stock restore is best-effort non-transactional (same accepted tradeoff as order creation in `routes/orders.js`).
- Deleted users → `order.userId` is null after populate: every render uses `?.name ?? 'Unknown customer'`.
- Animation constraints: the only new AnimatePresence uses are the expandable-row and insight-accordion height animations (same as customer OrdersPage); AdminLayout is a bare Outlet; no layout/layoutId anywhere — including inside the SVG charts.
- **`$dateTrunc` needs MongoDB 5.0+** — fine on the Atlas cluster in use. Buckets are UTC; day boundaries may look shifted vs local time — acceptable for a demo, note it in a code comment rather than fighting timezones.
- **Chart colors must not follow rank** — the alphabetical fixed assignment in `chartColors.js` is what keeps a category the same color across Week/Month/Year; don't "simplify" it to index-by-sorted-revenue.
- **Deltas with zero baselines** — prev = 0 & current > 0 renders "new", both 0 renders "no change"; never divide by zero.
- **`type="url"` input** would reject relative `/images/...` paths — the ImagePicker custom-URL input must be `type="text"`.

## End-to-end verification

Run `npm run dev` (server 5005 + client 5173; see `.claude/skills/verify/SKILL.md` for the Playwright-via-Chrome recipe). Full pass: admin login → dashboard sales report correct (donut sums to hero revenue, period toggle flips 7/30/12 buckets, category colors stable, tooltips + pinned detail work) → place a customer order in another context → appears in recent orders and moves the report numbers → orders page: shipped → delivered on one order; cancel another and confirm stock restore on products page, red badge on the customer's `/orders`, and the dashboard revenue drop → products page search/sort/chips + create product via gallery picker → customers page: promote/demote round-trip, self-row guarded. Also curl the Phase 1 checklist (401/403, transition 400s, no password field, sales-report bucket counts).

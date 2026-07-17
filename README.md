# Annz Bricks — E-Commerce Store

## Project Summary

Annz Bricks is a full-stack e-commerce application for browsing and purchasing vintage and rare LEGO sets. Customers can browse the catalogue by category, search products, view product detail pages, and manage a shopping cart as a guest. To pay, customers create an account (or sign in) and complete a detailed three-step checkout — shipping address, payment method, and review — with support for Credit Card, Apple Pay, Zip, and Afterpay (all **simulated**; no real payments are processed). Orders are recorded with an order number and can be reviewed on the order history page.

An authenticated admin portal (JWT, role-based) provides full inventory management: creating, editing, and deleting products and adjusting stock levels.

## Technical Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| **Frontend**   | React 18 (JSX), bootstrapped with Vite 5                          |
| **Routing**    | react-router-dom v6 (catalogue, product detail, checkout, orders, auth, admin) |
| **Animation**  | Framer Motion 11 (page transitions, staggered grids, cart drawer spring, checkout step transitions) |
| **Styling**    | Tailwind CSS 3 with custom utility classes                        |
| **State**      | React Context: `AuthContext`, `CartContext`, `ToastContext`       |
| **Backend**    | Node.js with Express.js REST API                                  |
| **Auth**       | JWT (7-day expiry) + bcryptjs password hashing, role-based middleware (`customer` / `admin`) |
| **Database**   | MongoDB Atlas (cloud-hosted), accessed via Mongoose ODM           |
| **Validation** | express-validator on all API routes                               |
| **HTTP Client**| Axios with request/response interceptors (Bearer token, 401 redirect) |

## Feature List

- **Multi-page SPA** with react-router: `/` (catalogue + hero), `/products/:id` (detail), `/login`, `/register`, `/checkout`, `/orders`, `/orders/:id/confirmation`, `/admin`, plus a 404 page. Animated page transitions between routes.
- **Customer accounts:** register/login with hashed passwords and JWT. Auth is only required at checkout — guests browse and hold a cart freely.
- **Guest cart with merge:** guest carts live in `localStorage` and are automatically merged into the user's server-side cart on login/registration (quantities clamped to available stock).
- **Per-user server carts:** cart items are scoped to the logged-in user; stock limits enforced on add/update.
- **Detailed 3-step checkout:** shipping address (validated), payment method, review & place order — with direction-aware animated step transitions and a sticky order summary.
- **Simulated payment methods:**
  - **Credit Card (Stripe-branded)** — formatted card number input with Luhn validation, brand detection (Visa/Mastercard/Amex), expiry and CVC validation. CVC is never sent to the server; only brand + last4 are stored. Structured so real Stripe keys (`STRIPE_SECRET_KEY` in `server/.env`) can be wired in later — until then the charge is simulated like everything else.
  - **PayPal** — for international customers; simulated redirect + approval flow.
  - **Apple Pay** — simulated payment sheet with confirm/processing/done states.
  - **Zip / Afterpay** — simulated redirect + approval flow with 4-installment messaging.
  - Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined (HTTP 402). Payment processing includes a realistic ~1.5s delay.
- **International checkout:** the shipping step has a country dropdown (Australia default + 21 common countries) and accepts international postcode formats (e.g. `SW1A 1AA`, `70000`). The order records the customer's country; admins see it in the order detail (bolded when it isn't Australia) and can search orders by country.
- **Orders:** stock is decremented atomically at order time (with rollback on shortage), prices/names are snapshotted onto the order, cart is cleared, and an order number (e.g. `AB-XXXXXXXXXX`) is issued. Animated confirmation page + expandable order history.
- **Product reviews:** once an order is **delivered**, the customer can review each product in it — star rating, comment, and up to 3 photos (5MB each, stored under `server/uploads/`, random filenames, image types only). One review per product per delivered order, marked "Verified purchase". Reviews (with an average-rating summary) show on the product detail page; admins moderate them at **Admin → Reviews** — reply publicly ("Response from Annz Bricks"), edit replies, or delete reviews.
- **Google reviews:** set `GOOGLE_REVIEW_URL` in `server/.env` to your Google Business review link (Google Business Profile → "Ask for reviews" → copy the short link, e.g. `https://g.page/r/<code>/review`). Customers are invited to review the store on Google on the order confirmation page and right after submitting a product review. Leave the variable unset to hide the prompts.
- **Delivery tracking (AusPost + Cainiao Global):** every status change is timestamped into the order's `statusHistory`. Staff enter the real tracking number manually via the **Add tracking number** button on the admin order, choosing the carrier — **AusPost** for domestic or **Cainiao Global Express** for international (allowed while processing/shipped; validated, auto-uppercased). Customers see a delivery timeline — Order placed → Shipped → Delivered (or a Cancelled branch) — with dates, a copy-to-clipboard tracking number, and a **Track** link that opens the right carrier's tracking page, in their order history and on the confirmation page.
- **Server-owned tax:** `GET /api/config` exposes the tax rate (env `TAX_RATE`); totals are computed server-side at order time.
- **Consistent product image treatment:** a single `ProductImage` component renders every product image in a fixed-aspect, padded frame with `object-contain` — images always fit fully inside the frame, uncropped, with zero layout shift and a fallback icon on error.
- **Catalogue UX:** category filter chips (animated active pill), live search, staggered product-grid reveal, animated filtering (cards reflow smoothly), hover lift, add-to-cart button morphs (label → spinner → checkmark), stock badges ("Sold Out", "Only X left!").
- **Cart drawer:** spring-animated slide-in, animated line-item add/remove, quantity controls, Escape/backdrop close.
- **Admin portal (protected):** a full admin section at `/admin` (nested routes + sidebar), reachable only by admin users; all `/api/admin/*` routes require an admin JWT.
  - **Sales dashboard** — period toggle (week/month/year), revenue hero with vs-previous-period deltas, KPI tiles, category-breakdown donut (hover tooltips, click-to-pin detail, colorblind-validated palette), revenue-over-time chart, top products, and "needs attention" accordions (low stock, sold out, awaiting shipment). Revenue is reported excluding tax so the breakdown sums exactly.
  - **Order management** — all customers' orders with status filter chips and search; status flow `processing → shipped → delivered` plus **cancel with automatic stock restore** (atomic transition guard prevents double-restores).
  - **Product management** — search, category chips, sortable columns, inline stock editing, two-click delete, and a create/edit modal with an **image gallery picker** listing the actual `/images` files (plus custom-URL fallback).
  - **Customer management** — order counts and total spend per user, promote/demote admin role (self-demotion blocked).
- **Accessibility & polish:** `prefers-reduced-motion` support (falls back to opacity-only transitions), toast notifications, loading skeletons, friendly error states, orphan cart cleanup.

## API Overview

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/register` | — | Create account → `{ token, user }` |
| POST | `/api/auth/login` | — | Login → `{ token, user }` |
| GET | `/api/auth/me` | user | Current user from token |
| GET | `/api/products` | — | List products |
| GET | `/api/products/:id` | — | Single product |
| POST/PUT/DELETE | `/api/products[/:id]` | admin | Product CRUD |
| GET | `/api/cart` | user | Current user's cart (populated) |
| POST | `/api/cart` | user | Add / increment item (stock-checked) |
| POST | `/api/cart/merge` | user | Merge a guest cart after login |
| PUT/DELETE | `/api/cart/:id` | user | Update qty / remove item |
| POST | `/api/orders` | user | Place order (simulated payment, ~1.5s; 402 on decline card) |
| GET | `/api/orders` | user | Order history |
| GET | `/api/orders/:id` | user | Single order (own; admin can view any) |
| GET | `/api/reviews/product/:id` | — | Product reviews + `{ avg, count }` |
| GET | `/api/reviews/mine` | user | The caller's reviews (for "Reviewed ✓" state) |
| POST | `/api/reviews` | user | Create review (multipart: rating, comment, up to 3 images; delivered orders only) |
| GET | `/api/admin/reviews` | admin | All reviews for moderation |
| PATCH | `/api/admin/reviews/:id/reply` | admin | Public store response |
| DELETE | `/api/admin/reviews/:id` | admin | Remove a review (+ its photos) |
| GET | `/api/config` | — | `{ taxRate, currency, googleReviewUrl }` |
| GET | `/api/health` | — | Health check |
| GET | `/api/admin/stats` | admin | Headline totals, low stock, recent orders |
| GET | `/api/admin/sales-report?period=week\|month\|year` | admin | Summary + deltas, timeseries, by-category, top products |
| GET | `/api/admin/orders` | admin | All orders (customer populated) |
| PATCH | `/api/admin/orders/:id/status` | admin | `shipped`/`delivered`/`cancelled` (cancel restores stock) |
| PATCH | `/api/admin/orders/:id/tracking` | admin | Set tracking number + carrier (`auspost`/`cainiao`; processing/shipped only) |
| GET | `/api/admin/customers` | admin | Users with order count + total spent |
| PATCH | `/api/admin/customers/:id/role` | admin | Promote/demote (not yourself) |
| GET | `/api/admin/images` | admin | Gallery listing of the local `/images` folder |

## Folder Structure

```
AnnStore/
├── client/                          # Frontend (React + Vite)
│   ├── index.html
│   ├── vite.config.js               # Dev server proxy: /api and /images → localhost:5005
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx                 # BrowserRouter > ToastProvider > AuthProvider > CartProvider > App
│       ├── App.jsx                  # Route definitions
│       ├── index.css                # Tailwind directives + custom component classes
│       ├── context/                 # AuthContext, CartContext (guest/server dual mode), ToastContext
│       ├── services/api.js          # Axios instance + interceptors + all endpoint functions
│       ├── utils/payment.js         # Luhn check, card formatting, brand detection, expiry/CVC validation
│       ├── pages/                   # Catalogue, ProductDetail, Login, Register, Checkout,
│       │                            # OrderConfirmation, Orders, Admin, NotFound
│       └── components/
│           ├── ProductImage.jsx     # Fixed-aspect object-contain image frame (used everywhere)
│           ├── ProductCard.jsx      # Animated catalogue card (links to detail page)
│           ├── CartDrawer.jsx       # Spring-animated cart drawer
│           ├── AdminPanel.jsx / ProductModal.jsx
│           ├── Toast.jsx
│           ├── guards.jsx           # RequireAuth / RequireAdmin route guards
│           ├── checkout/            # ShippingStep, PaymentStep, ReviewStep (+ simulated pay sheets)
│           ├── layout/              # RootLayout (page transitions), Navbar
│           └── motion/variants.js   # Shared Framer Motion variants + reduced-motion support
├── server/                          # Backend (Node.js + Express)
│   ├── .env                         # MONGODB_URI, PORT, JWT_SECRET, TAX_RATE (not committed)
│   └── src/
│       ├── index.js                 # Express app, routes, static /images, JWT_SECRET startup guard
│       ├── seed.js                  # Seeds 29 products + admin user
│       ├── middleware/              # auth.js (requireAuth/requireAdmin), errorHandler.js
│       ├── models/                  # Product, CartItem (per-user), Order, User
│       └── routes/                  # products, cart (incl. /merge), orders (simulated payment), auth
├── images/                          # Local product images served via Express static middleware
├── package.json                     # Root: concurrently runs client + server with `npm run dev`
└── docs/OVERHAUL_PLAN.md            # The implementation plan this build followed
```

## How to Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adgtristy-ux/AnnStore.git
   cd AnnStore
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

3. **Configure the environment** — create `server/.env` (see `server/.env.example`):
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
   PORT=5005
   JWT_SECRET=<any random string of 32+ characters>
   TAX_RATE=0.1
   ```
   > The Vite dev proxy targets port **5005** — keep `PORT=5005` unless you also change `client/vite.config.js`.

4. **Seed the database:**
   ```bash
   cd server && npm run seed
   ```

5. **Start the development servers:**
   ```bash
   npm run dev
   ```
   This starts the Express backend (port 5005, auto-reloading via nodemon) and the Vite frontend (port 5173) concurrently.

6. **Open the app:** `http://localhost:5173`

### Demo credentials & test data

| What | Value |
| ---- | ----- |
| Admin login | `admin@annzbricks.com` / `12345@` |
| Successful test card | `4242 4242 4242 4242` (any future expiry, any CVC) |
| Declined test card | `4000 0000 0000 0002` |

### Security notes

- Payments are **simulated** — no payment processor is involved, and full card numbers/CVCs are never stored (only brand + last4 on the order).
- Passwords are hashed with bcrypt; sessions use 7-day JWTs stored in `localStorage` (simple for a demo app, but XSS-exposed compared to httpOnly cookies — noted trade-off).
- `server/.env` is git-ignored. If the MongoDB Atlas connection string has ever been shared, rotate the database user's password in Atlas as a hygiene step.

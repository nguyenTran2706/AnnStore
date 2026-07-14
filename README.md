# Annz Bricks — E-Commerce Shopping Cart

## Project Summary

Annz Bricks is a single-page e-commerce application that allows users to browse, search, and purchase vintage and rare LEGO sets. The application addresses the need for a seamless, modern online shopping experience where every interaction — from browsing product categories to completing a purchase — happens within a single HTML page without any full-page reloads.

Users can view all available products organised by category, add items to a shopping cart, adjust item quantities, remove individual items, and proceed through a checkout flow that validates available stock in real time. An authenticated admin panel provides full inventory management capabilities, including creating new products, editing existing listings, adjusting stock levels, and deleting discontinued items.

## Technical Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| **Frontend**   | React 18 (JSX), bootstrapped with Vite 5                         |
| **Styling**    | Tailwind CSS 3 with custom utility classes and CSS keyframe animations |
| **Routing**    | Client-side view switching via React Context API and conditional rendering (no external router library; the app swaps between `ProductGrid` and `AdminPanel` components dynamically) |
| **State**      | React Context (`AppContext`) providing global state to all components |
| **Backend**    | Node.js with Express.js REST API                                  |
| **Database**   | MongoDB Atlas (cloud-hosted), accessed via Mongoose ODM           |
| **Validation** | express-validator for server-side input validation on all API routes |
| **HTTP Client**| Axios with a shared base instance for all frontend API calls       |

## Feature List

- **Single-page application (SPA):** Only one `index.html` file; all views are dynamically rendered React components swapped via state — no page reloads occur during navigation.
- **Full CRUD operations on the database:**
  - **Create:** Admin can add new products via a modal form; users create cart items by adding products to the cart.
  - **Read:** All products are fetched and displayed on load; cart items are read from the database and populated in the cart drawer.
  - **Update:** Admin can edit product details (name, description, price, category, image, stock) and inline-edit stock levels; users can update cart item quantities with `+`/`-` controls.
  - **Delete:** Admin can delete products with a two-click confirmation flow; users can remove individual items from the cart; checkout clears all cart items.
- **Dynamic category filtering:** Products are filterable by category tabs (e.g., Lego Maersk Sets, Ninjago, Modular Buildings, Star Wars, Minifigures, Parts) that update the grid instantly.
- **Live search:** A text search bar filters products by name or description in real time as the user types.
- **Real-time stock tracking:** Purchasing items decrements stock in the database; "Sold Out" and "Only X left!" badges update dynamically.
- **Responsive mobile design:** The layout adapts across desktop, tablet, and mobile screen sizes using Tailwind's responsive breakpoints. The admin panel renders a table view on desktop and a card-based layout on mobile.
- **Animated cart drawer:** The shopping cart slides in from the right with CSS keyframe animations (`slideRight`/`slideRightOut`) and closes on backdrop click or the `Escape` key.
- **Toast notification system:** Non-intrusive popup notifications provide feedback on every user action (e.g., "Added to cart", "Product deleted", "Checkout failed").
- **Checkout with stock validation:** The server validates that sufficient stock exists for every item before deducting inventory and clearing the cart.
- **Order confirmation modal:** A success popup with a checkmark animation confirms the order after a successful checkout.
- **Authenticated admin portal:** Admin access is gated behind a login modal that validates credentials against the database.
- **Input validation:** Both client-side form validation and server-side express-validator rules prevent malformed data from reaching the database.
- **Error state handling:** If the API or database is unreachable, the app displays a user-friendly error screen with a "Try again" button instead of a blank page.
- **Orphan cart cleanup:** The server automatically detects and removes stale cart item references (e.g., if an admin deletes a product that a user had in their cart).

## Folder Structure

```
Ass1-Prog/
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # Single HTML entry point for the SPA
│   ├── package.json                 # Frontend dependencies (react, vite, tailwindcss, axios)
│   ├── vite.config.js               # Vite dev server config with API proxy to backend
│   ├── tailwind.config.js           # Tailwind theme customisation (colours, fonts, shadows)
│   ├── postcss.config.js            # PostCSS config for Tailwind processing
│   └── src/
│       ├── main.jsx                 # React entry point (renders <App /> into #root)
│       ├── App.jsx                  # Root component: global state provider, view routing, all event handlers
│       ├── index.css                # Global styles: Tailwind directives, custom component classes, keyframe animations
│       ├── assets/images/           # Static branding assets (logo, background image)
│       ├── services/
│       │   └── api.js               # Axios-based API abstraction layer (all HTTP calls in one file)
│       └── components/
│           ├── Navbar.jsx           # Top navigation bar with logo, Shop/Admin tabs, cart icon with badge
│           ├── ProductGrid.jsx      # Product listing with category filter tabs and search bar
│           ├── ProductCard.jsx      # Individual product card with image, stock badge, and "Add to cart" button
│           ├── CartDrawer.jsx       # Slide-in cart panel with quantity controls, price summary, and checkout
│           ├── AdminPanel.jsx       # Admin inventory table with inline stock editing, edit/delete actions
│           ├── AdminLogin.jsx       # Login modal for admin authentication
│           ├── ProductModal.jsx     # Create/Edit product form modal (used by AdminPanel)
│           └── Toast.jsx            # Toast notification container component
├── server/                          # Backend (Node.js + Express)
│   ├── package.json                 # Backend dependencies (express, mongoose, cors, express-validator, dotenv)
│   ├── .env                         # Environment variables (MONGODB_URI, PORT)
│   └── src/
│       ├── index.js                 # Express server entry point: middleware, routes, MongoDB connection, static file serving
│       ├── seed.js                  # Database seed script: populates 29 products and admin credentials
│       ├── middleware/
│       │   └── errorHandler.js      # Centralised error-handling middleware (validation, cast, and generic errors)
│       ├── models/
│       │   ├── Product.js           # Mongoose schema: name, description, price, category, imageUrl, stock
│       │   ├── CartItem.js          # Mongoose schema: productId (ref to Product), quantity, addedAt
│       │   └── Admin.js             # Mongoose schema: username, password
│       └── routes/
│           ├── products.js          # RESTful product routes: GET (list), POST (create), PUT (update), DELETE (delete)
│           ├── cart.js              # Cart routes: GET (list), POST (add/increment), PUT (update qty), DELETE (remove), POST /checkout
│           └── admin.js             # Admin route: POST /login (credential verification)
├── images/                          # Local product images served via Express static middleware
│   ├── Maersk Sets/                 # 5 Maersk LEGO set images
│   ├── Ninjago/                     # 5 Ninjago set images
│   ├── Modular Buildings/           # 5 Modular Buildings set images
│   ├── Star Wars/                   # 4 Star Wars set images
│   ├── Minifigures/                 # 5 Minifigure images
│   └── Parts/                       # 5 LEGO part images
├── package.json                     # Root package: concurrently runs client + server with `npm run dev`
└── README.md                        # This file
```

## Challenges Overcome

Building reliable state synchronisation between the React frontend and the MongoDB backend was the most significant challenge. A critical bug emerged where the checkout process would crash if an administrator deleted a product while a user still had that item in their cart — the `CartItem` document held an orphaned `ObjectId` reference to a product that no longer existed, causing Mongoose's `.populate()` to return `null` and the frontend to throw a TypeError. This was resolved by implementing an automatic cleanup mechanism on the server: every `GET /api/cart` request now filters out stale references and deletes orphaned `CartItem` documents before sending the response, and the checkout endpoint performs the same validation before processing any stock deductions. On the frontend, a unified error-handling pattern using the Context API's `addToast` callback ensures that any API failure surfaces a human-readable notification rather than silently failing or showing a blank screen.

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

3. **Configure the database:**
   - Create a `.env` file in the `server/` directory:
     ```
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
   PORT=5001
     ```

4. **Seed the database:**
   ```bash
   cd server && node src/seed.js
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   This starts both the Express backend (port 5001) and the Vite frontend (port 5173) concurrently.

6. **Open the app:** Navigate to `http://localhost:5173` in your browser.

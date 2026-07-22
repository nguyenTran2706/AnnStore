# Deploying Annz Bricks to Vercel

This app runs **all-in on Vercel** as a single project:

- **Frontend** — the Vite/React client is built to static files and served from Vercel's CDN.
- **Backend** — the Express API runs as a serverless function at `/api/*` ([api/index.js](api/index.js) wraps [server/src/app.js](server/src/app.js)).
- **Database** — MongoDB Atlas (managed cloud Mongo).
- **Product images** — static files in [client/public/images/](client/public/images/), served by the CDN.
- **Review photos** — uploaded to **Vercel Blob** storage.

Routing is configured in [vercel.json](vercel.json): `/api/*` → serverless function, static files served directly, everything else → the SPA (`index.html`).

---

## 1. Set up MongoDB Atlas (free tier)

1. Create an account at <https://www.mongodb.com/cloud/atlas> and create a **free M0 cluster**.
2. **Database Access** → add a database user (username + password). Save these.
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). Vercel's serverless IPs are dynamic, so this is required.
4. **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/shopflow?retryWrites=true&w=majority
   ```
   Replace `<user>`/`<password>` and add the database name `shopflow` before the `?`.

## 2. Seed the Atlas database

Run the seed script **locally, pointed at Atlas** (one time). In [server/.env](server/.env) set `MONGODB_URI` to your Atlas string, then from the repo root:

```bash
npm run seed
```

This creates the 29 products and the admin account:

- **Admin login:** `admin@annzbricks.com` / `12345@`  *(change the password after first login)*

## 3. Push to GitHub

Commit and push everything (the moved images, `api/`, `vercel.json`, `client/public/images-manifest.json`):

```bash
git add -A
git commit -m "Prepare for Vercel deployment"
git push
```

## 4. Import the project into Vercel

1. Go to <https://vercel.com/new> and import your GitHub repo.
2. Leave **Root Directory** as the repository root (`./`). Do **not** point it at `client/`.
3. Framework preset: **Other** (the build is already defined in `vercel.json` — build command, output dir, and install command are read from there, so you don't need to fill them in).
4. Don't deploy yet — add the environment variables first (next step). If you already clicked deploy, that's fine; add the vars and redeploy.

## 5. Create a Vercel Blob store (for review photos)

1. In the Vercel project → **Storage** tab → **Create Database** → **Blob** → create the store and **connect it to this project**.
2. This automatically adds a `BLOB_READ_WRITE_TOKEN` environment variable to the project. You don't set it by hand.

## 6. Set environment variables

Project → **Settings** → **Environment Variables** (apply to Production, Preview, and Development):

| Name | Value | Notes |
|------|-------|-------|
| `MONGODB_URI` | your Atlas connection string | required |
| `JWT_SECRET` | a random 32+ char string | required — generate with `openssl rand -hex 32` |
| `TAX_RATE` | e.g. `0.1` | optional (defaults to 0.1) |
| `GOOGLE_REVIEW_URL` | your Google review link | optional |
| `BLOB_READ_WRITE_TOKEN` | *(added automatically in step 5)* | do not set manually |

## 7. Deploy

Trigger a deploy (push a commit, or **Deployments → Redeploy**). Vercel will:

- run `npm install` at the root, in `server/`, and in `client/`,
- build the client (`npm --prefix client run build`) into `client/dist`,
- bundle `api/index.js` (+ the Express app and its `server/` dependencies) as a serverless function.

## 8. Verify

- `https://<your-app>.vercel.app/api/health` → `{"status":"ok",...}`
- The storefront loads with product images.
- Log in as admin → **Admin** area works (dashboard, orders, customers).
- Add to cart → checkout (simulated payment) → order appears.
- After an order is marked **delivered**, leaving a review with a photo stores it in Blob.

---

## Notes & gotchas

- **Review-photo size limit:** Vercel serverless caps the request body at ~4.5 MB, so [reviews.js](server/src/routes/reviews.js) limits uploads to **3 photos, 1 MB each**. For larger uploads later, switch to Vercel Blob **client uploads** (browser → Blob directly, bypassing the function).
- **Adding product images:** drop files into [client/public/images/](client/public/images/), then run `npm run gen:images` to refresh `client/public/images-manifest.json` (this powers the admin image picker), and commit both.
- **Local development is unchanged:** `npm run dev` still runs the client (5173) + Express (5005). Product images are served by Vite from `public/`. Review photos fall back to local disk (`server/uploads/`) when `BLOB_READ_WRITE_TOKEN` isn't set.
- **Cold starts:** the first request after idle reconnects to Mongo (cached afterward), so it may be slightly slower.

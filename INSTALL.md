# Creator Bio Hub — Local Installation Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 10+ (bundled with Node 20) |
| Docker + Docker Compose | any recent |
| Twitch Developer Rig | latest |

---

## 1. Clone & install

```bash
git clone <repo-url> creator-bio-hub
cd creator-bio-hub
npm install
```

---

## 2. Build the shared types package

The backend and extension both depend on `@creator-bio-hub/types`. Build it once before first run:

```bash
npm run build --workspace=@creator-bio-hub/types
```

---

## 3. Environment variables

### Backend (`packages/backend/.env`)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/creator_bio_hub"
TWITCH_EXT_SECRET="<base64-encoded secret from Twitch Dev Console>"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_SUCCESS_URL="http://localhost:8080?upgrade=success"
STRIPE_CANCEL_URL="http://localhost:8080?upgrade=cancel"
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

### Extension (`packages/extension/.env`)

```env
VITE_API_BASE=http://localhost:3001/v1
```

---

## 4. Database

```bash
# Start Postgres via Docker
docker compose up -d db

# Run migrations
npm run db:migrate --workspace=@creator-bio-hub/backend
```

---

## 5. Run in development

```bash
# Terminal 1 — backend (hot-reload via tsx watch)
npm run dev --workspace=@creator-bio-hub/backend

# Terminal 2 — extension (Vite dev server on :8080)
npm run dev --workspace=@creator-bio-hub/extension
```

The extension Vite server runs on `http://localhost:8080`. The backend API runs on `http://localhost:3001`.

> **Note:** The extension's Vite config resolves `@creator-bio-hub/types` directly from TypeScript
> source, so you do not need to rebuild types between extension dev iterations.
> The backend's `tsx watch` also handles `.ts` imports at dev time.

---

## 6. Twitch Developer Rig setup

1. Download the **Twitch Developer Rig** from the Twitch Dev Console.
2. Create an Extension in the Dev Console → note the **Extension Client ID** and **Extension Secret** (base64).
3. Paste the Extension Secret into `TWITCH_EXT_SECRET` in `packages/backend/.env`.
4. In the Rig, add your extension → set **Front-end Files Hosting** to `http://localhost:8080`.
5. Map each view in the Rig:
   - Panel → `http://localhost:8080/panel.html`
   - Video Overlay → `http://localhost:8080/overlay.html`
   - Mobile → `http://localhost:8080/mobile.html`
   - Config → `http://localhost:8080/config.html`
   - Live Config → `http://localhost:8080/live-config.html`
6. Click **Run** in the Rig to open a simulated Twitch channel with your extension loaded.

---

## 7. Stripe local webhooks

```bash
# Install Stripe CLI then:
stripe listen --forward-to http://localhost:3001/v1/webhooks/stripe
# Copy the webhook signing secret shown and set STRIPE_WEBHOOK_SECRET in .env
```

---

## 8. Production build

```bash
# Build types first
npm run build --workspace=@creator-bio-hub/types

# Type-check everything
npm run typecheck

# Build extension (outputs to packages/extension/dist/)
npm run build --workspace=@creator-bio-hub/extension

# Build backend Docker image
docker compose build backend

# Start all services
docker compose up -d
```

---

## 9. Database migrations in production

```bash
docker compose exec backend npx prisma migrate deploy
```

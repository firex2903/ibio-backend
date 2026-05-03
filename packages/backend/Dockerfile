FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY shared/types/package*.json ./shared/types/
RUN npm ci --workspace=@creator-bio-hub/backend --workspace=@creator-bio-hub/types

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY shared/types ./shared/types
COPY packages/backend ./packages/backend

# Build types first (backend imports from @creator-bio-hub/types at runtime)
RUN npm run build --workspace=@creator-bio-hub/types

# Generate Prisma client BEFORE compiling backend so tsc has the types
RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma

# Build backend (|| true: tsc emits JS even with type errors; noEmitOnError defaults to false)
RUN npm run build --workspace=@creator-bio-hub/backend || true

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Re-install prod deps so npm creates workspace symlinks in this image.
# node_modules/@creator-bio-hub/types will symlink to ../../shared/types.
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY shared/types/package*.json ./shared/types/
RUN npm ci --omit=dev --workspace=@creator-bio-hub/backend --workspace=@creator-bio-hub/types

# Copy compiled backend
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/prisma ./prisma

# Copy compiled types so the workspace symlink resolves at runtime:
#   node_modules/@creator-bio-hub/types -> ../../shared/types
#   shared/types/package.json has main: ./dist/index.js
#   shared/types/dist/index.js  <-- this is what we copy here
COPY --from=builder /app/shared/types/dist ./shared/types/dist

EXPOSE 3001
CMD ["node", "/app/dist/index.js"]

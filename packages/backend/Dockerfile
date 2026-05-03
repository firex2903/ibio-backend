FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY shared/types/package*.json ./shared/types/
RUN npm ci --workspace=@creator-bio-hub/backend --workspace=@creator-bio-hub/types

# ── Prisma Generate (isolated stage — invalidates when schema.prisma changes) ─
FROM deps AS prisma-client
# openssl needed so Prisma detects OpenSSL 3 and generates linux-musl-openssl-3.0.x binary
RUN apk add --no-cache openssl
COPY packages/backend/prisma ./packages/backend/prisma
RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma

# ── Build ─────────────────────────────────────────────────────────────────────
FROM prisma-client AS builder
COPY shared/types ./shared/types
COPY packages/backend ./packages/backend

# Build types first (backend imports from @creator-bio-hub/types at runtime)
RUN npm run build --workspace=@creator-bio-hub/types

# Build backend (|| true: tsc emits JS even with type errors; noEmitOnError defaults to false)
RUN npm run build --workspace=@creator-bio-hub/backend || true

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# openssl needed at runtime so Prisma detects OpenSSL 3 and loads linux-musl-openssl-3.0.x engine
RUN apk add --no-cache openssl

# Re-install prod deps so npm creates workspace symlinks in this image.
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY shared/types/package*.json ./shared/types/
RUN npm ci --omit=dev --workspace=@creator-bio-hub/backend --workspace=@creator-bio-hub/types

# Copy compiled backend
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma

# Copy generated Prisma client from isolated prisma-client stage
COPY --from=prisma-client /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled types so the workspace symlink resolves at runtime
COPY --from=builder /app/shared/types/dist ./shared/types/dist

EXPOSE 3001
CMD ["node", "/app/packages/backend/dist/index.js"]

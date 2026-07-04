FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/sql ./sql
COPY --from=builder /app/scripts/migrate.cjs ./scripts/migrate.cjs
COPY --from=builder /app/scripts/seed.cjs ./scripts/seed.cjs
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN mkdir -p /opt/db-tools \
  && cd /opt/db-tools \
  && npm init -y >/dev/null 2>&1 \
  && npm install --omit=dev pg bcryptjs \
  && chmod +x /docker-entrypoint.sh

ENV NODE_PATH=/opt/db-tools/node_modules
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN mkdir -p /app/uploads/paslon

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]

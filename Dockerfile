# -------------------------
# 1️⃣ Dependencies
# -------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Copiamos solo manifests para cachear bien
COPY package.json package-lock.json ./
RUN npm ci

# -------------------------
# 2️⃣ Build
# -------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Evita telemetry y ruido
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -------------------------
# 3️⃣ Runner (producción)
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiamos solo lo necesario
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]

# -------------------------
# 1️⃣ Dependencies
# -------------------------
# Fija una versión parcheada de Node 20
FROM node:20.18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# -------------------------
# 2️⃣ Build
# -------------------------
FROM node:20.18-alpine AS builder
WORKDIR /app

# Las variables ARG/ENV están perfectas aquí para el build de Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_UMAMI_URL
ENV NEXT_PUBLIC_UMAMI_URL=$NEXT_PUBLIC_UMAMI_URL

ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -------------------------
# 3️⃣ Runner (producción)
# -------------------------
FROM node:20.18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Exponer el host al exterior del contenedor (vital para el modo standalone)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar archivos asignando la propiedad al usuario seguro 'node'
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

# Cambiar al usuario sin privilegios para mitigar vulnerabilidades de ejecución
USER node

EXPOSE 3000
CMD ["node", "server.js"]
# syntax=docker/dockerfile:1
# Imagen única de SIGTI: Express sirve la API (/api) y el frontend compilado (client/dist).

ARG NODE_VERSION=24

# 1) Compilar el frontend con todas las dependencias (incluye las de desarrollo).
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --no-audit --no-fund
COPY client/ client/
RUN npm run build

# 2) Instalar solo las dependencias de producción del servidor.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server --no-audit --no-fund && npm cache clean --force

# 3) Imagen final: sin herramientas de compilación ni código del cliente.
FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    API_PORT=3000 \
    STATIC_DIR=/app/client/dist \
    APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="sigti" \
      org.opencontainers.image.revision="${APP_VERSION}"

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server/ server/
COPY --from=build /app/client/dist client/dist

# El proceso corre sin privilegios de root.
USER node
WORKDIR /app/server
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "src/index.js"]

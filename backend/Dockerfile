# syntax=docker/dockerfile:1.7
# Backend (Express + Socket.io) da Roda.
#
# O contexto de build é a RAIZ do repositório, porque o backend importa
# ../shared (catálogo e regras dos jogos):
#   docker build -f backend/Dockerfile .
#
# É o mesmo Dockerfile usado no Railway (Root Directory "/" +
# RAILWAY_DOCKERFILE_PATH=backend/Dockerfile). O último estágio (prod) é o padrão.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app

# Dependências de produção
FROM base AS deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev --no-audit --no-fund

# Desenvolvimento com hot reload (docker-compose.dev.yml monta src/ e shared/)
FROM base AS dev
ENV NODE_ENV=development
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --no-audit --no-fund
COPY backend/src ./backend/src
COPY shared ./shared
EXPOSE 3000
# --legacy-watch: polling, porque o bind mount do Windows não gera eventos de arquivo
CMD ["backend/node_modules/.bin/nodemon", "--legacy-watch", "--watch", "backend/src", "--watch", "shared", "backend/src/index.js"]

# Produção
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY shared ./shared
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --start-interval=1s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" > /dev/null || exit 1
CMD ["node", "backend/src/index.js"]

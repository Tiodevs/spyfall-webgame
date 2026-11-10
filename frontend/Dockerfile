# syntax=docker/dockerfile:1.7
# Frontend (React + Vite) da Roda.
#
# O contexto de build é a RAIZ do repositório, porque o front importa ../shared:
#   docker build -f frontend/Dockerfile .
#
# Em produção o front continua na Vercel; este arquivo é para rodar local.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend --no-audit --no-fund

# Desenvolvimento: Vite com hot reload (docker-compose.dev.yml)
FROM deps AS dev
COPY frontend ./frontend
COPY shared ./shared
WORKDIR /app/frontend
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Build estático
FROM deps AS build
COPY frontend ./frontend
COPY shared ./shared
# Vazio = mesma origem: o nginx abaixo repassa /socket.io e /api ao backend.
ARG VITE_SOCKET_URL=""
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
RUN npm run build --prefix frontend

# Servidor estático + proxy para o backend (docker-compose.yml)
FROM nginx:1.27-alpine AS prod
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80

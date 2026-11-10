// Endereço do backend (Socket.io + API REST).
// - VITE_SOCKET_URL com valor → usa esse host (ex.: Railway em produção).
// - VITE_SOCKET_URL vazio     → mesma origem da página: o nginx (Docker) ou o
//                               proxy do Vite repassam /socket.io e /api ao backend.
// - VITE_SOCKET_URL ausente   → backend local padrão.
// A barra final é removida para não gerar URLs como "https://api.app//api/rooms".
const raw = import.meta.env.VITE_SOCKET_URL;

export const SERVER_URL = (raw ?? 'http://localhost:3000').trim().replace(/\/+$/, '');

export function apiUrl(path) {
  return `${SERVER_URL}${path}`;
}

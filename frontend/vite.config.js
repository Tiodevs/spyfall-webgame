import path from "path"
import process from "node:process"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Usados pelo docker-compose.dev.yml:
// - DEV_PROXY_TARGET: repassa /socket.io e /api para o backend (mesma origem,
//   funciona também pelo IP da rede no celular).
// - DEV_USE_POLLING: bind mount do Windows não propaga eventos de arquivo.
const proxyTarget = process.env.DEV_PROXY_TARGET
const usePolling = process.env.DEV_USE_POLLING === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acesso externo (0.0.0.0)
    port: 5173,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    proxy: proxyTarget
      ? {
          '/socket.io': { target: proxyTarget, ws: true, changeOrigin: true },
          '/api': { target: proxyTarget, changeOrigin: true },
        }
      : undefined,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
})

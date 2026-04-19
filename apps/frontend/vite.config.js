import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000'
  const certFile = env.VITE_SSL_CERT_FILE
  const keyFile = env.VITE_SSL_KEY_FILE
  const useHttps = Boolean(certFile && keyFile)

  return {
    plugins: [react(), tailwindcss(),],
    server: {
      host: true,
      https: useHttps ? {
            cert: fs.readFileSync(certFile),
            key: fs.readFileSync(keyFile),
          }
        : undefined,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['host.docker.internal', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
      '/connect': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // AG-Grid editor ekranı route-level lazy load ile ayrıldı; yine de grid
    // runtime'ı tek vendor chunk olarak büyük kalıyor. Bu eşik, artık bilinçli
    // ayrıştırılmış 3rd-party chunk için false-positive warning üretmesin.
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid-community') || id.includes('ag-grid-react')) {
            return 'ag-grid'
          }
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts'
          }
          if (id.includes('react-router-dom') || id.includes('@tanstack/react-query')) {
            return 'app-vendors'
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    // strictPort: port doluysa otomatik 3001/3002... fallback yapma — fail et.
    // Aksi halde paralel duran eski Vite süreçleri sessizce yeni porta kayar
    // ve geliştirici hangi sürümü gördüğünü bilemez.
    strictPort: true,
    // host: true binds to 0.0.0.0 so the dev server is reachable from Docker +
    // LAN peers. F4 Part 1 security-reviewer LOW: on a shared office Wi-Fi or
    // VPN this also exposes /api and /connect through the proxy. Kept `true`
    // because the developer workflow needs Docker access; tighten via a
    // host-bound env (e.g. VITE_DEV_HOST=127.0.0.1) if you move onto an
    // untrusted network. Production uses a different Vite invocation.
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

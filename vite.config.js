// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API calls
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''), // /api/generate -> /generate
      },
      // serve generated videos directly from backend
      '/videos': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})

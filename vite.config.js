import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api/ghl-contacts': {
        target: 'https://carbotsystem.com',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://carbot-5d709.web.app',
        changeOrigin: true,
      }
    }
  },
  preview: {
    proxy: {
      '/api/ghl-contacts': {
        target: 'https://carbotsystem.com',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://carbot-5d709.web.app',
        changeOrigin: true,
      }
    }
  }
})

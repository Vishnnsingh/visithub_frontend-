import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { visitManifestPlugin } from './vite.visit-manifest.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), visitManifestPlugin()],
  // Visit PWA: same-origin manifest + /uploads proxy for home-screen icons.
  server: {
    proxy: {
      '/uploads': 'http://localhost:5000',
    },
  },
  preview: {
    proxy: {
      '/uploads': 'http://localhost:5000',
    },
  },
})

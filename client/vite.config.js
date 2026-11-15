import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// VITE_BASE controls asset path resolution:
//   - Electron (file:// protocol) needs relative paths → base: './'
//   - Netlify / web hosting needs absolute paths   → base: '/'
//
// When building for Netlify (CI=true or NETLIFY=true), use '/'
// so that asset references in index.html are absolute and work
// correctly when the SPA redirect rule serves index.html for any path.
// Electron builds locally without those env vars, so they keep './'
const isNetlify = process.env.NETLIFY === 'true' || process.env.CI === 'true'

export default defineConfig({
  plugins: [react()],
  base: isNetlify ? '/' : './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})

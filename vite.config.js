import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testSetup.js'],
    // Excludes the pre-existing *.test.mjs files (src/lib/bookingCheckoutSteps.
    // test.mjs, src/lib/orderPaymentState.test.mjs) — a separate, standalone
    // `node <file>.mjs` convention (plain node:assert, no framework) that
    // predates this Vitest setup and is meant to keep running that way, not
    // be picked up here.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.ideasestudio.com',
        changeOrigin: true,
        secure: true,
      },
      '/public': {
        target: 'https://api.ideasestudio.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

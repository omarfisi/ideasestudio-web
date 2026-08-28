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
    // Dev-server only — never bundled into `vite build`/production. Points
    // at the local CRM backend, never production: several public API
    // clients (api.js, authenticatedApi.js, publicServicesApi.js,
    // publicChatApi.js) resolve their base from CRM_PUBLIC_API_BASE_URL
    // (VITE_CRM_BASE_URL) with a silent empty-string fallback — if that env
    // var were ever missing, those clients would fetch a relative /api or
    // /public path, and this proxy is what actually receives it. Pointing
    // it at production (the previous config) meant a missing env var could
    // silently create/read data against production from local dev — see
    // the "Envío no encontrado." incident this session, caused by the same
    // class of bug in publicFormsApi.js's own fallback chain.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

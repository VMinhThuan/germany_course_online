import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    maxWorkers: 4,
    setupFiles: ['./src/tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./TG3/tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/TG3/src'
    }
  }
})
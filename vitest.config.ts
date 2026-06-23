import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      APP_PASSPHRASE: 'test-passphrase',
    },
  },
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname },
  },
})

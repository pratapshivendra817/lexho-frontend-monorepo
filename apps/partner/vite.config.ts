import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lexho/ui': fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
      '@lexho/api': fileURLToPath(new URL('../../packages/api/src', import.meta.url)),
      '@lexho/auth': fileURLToPath(new URL('../../packages/auth/src', import.meta.url))
    }
  }
})

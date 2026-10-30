import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const vendorChunkGroups: Array<[string, string[]]> = [
  ['firebase', ['firebase']],
  ['maps', ['mapbox-gl', '@mapbox']],
  ['charts', ['recharts', 'd3-']],
  ['tables', ['@tanstack/react-table']],
  ['query', ['@tanstack/react-query']],
  ['forms', ['react-hook-form', '@hookform/resolvers', 'zod']],
  ['ui', ['@mui', '@emotion', '@radix-ui', 'react-hot-toast', 'lucide-react', 'react-icons']],
  ['realtime', ['@stomp/stompjs']],
]

function resolveVendorChunk(id: string) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  for (const [chunkName, packages] of vendorChunkGroups) {
    if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`/node_modules/${pkg}`))) {
      return `vendor-${chunkName}`
    }
  }

  if (id.includes('/node_modules/react-router') || id.includes('/node_modules/@remix-run/')) {
    return 'vendor-routing'
  }

  if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
    return 'vendor-react'
  }

  return 'vendor-misc'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiProxyTarget = env.VITE_DEV_API_PROXY_TARGET?.trim() || 'http://192.168.31.38:8082'

  return {
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        headers: {
          origin: 'http://localhost:5173',
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Spring's development CORS allow-list permits the website origin, not Vite's
            // dynamically selected Admin port. The browser still talks same-origin to Vite.
            proxyReq.setHeader('origin', 'http://localhost:5173')
          })
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options']
            delete proxyRes.headers['content-security-policy']
          })
        }
      },
      '/images': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lexho/ui': fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
      '@lexho/api': fileURLToPath(new URL('../../packages/api/src', import.meta.url)),
      '@lexho/auth': fileURLToPath(new URL('../../packages/auth/src', import.meta.url)),
      '@lexho/constants': fileURLToPath(new URL('../../packages/constants/src', import.meta.url)),
      '@lexho/hooks': fileURLToPath(new URL('../../packages/hooks/src', import.meta.url)),
      '@lexho/utils': fileURLToPath(new URL('../../packages/utils/src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return resolveVendorChunk(id)
        }
      }
    }
  }
  }
})

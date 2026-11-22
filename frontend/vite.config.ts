import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { campusMap } from './campusMapPlugin'

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://127.0.0.1:4000'
  const proxy = { '/api': target }
  return {
    plugins: [react(), tailwindcss(), campusMap()],
    // Per mode, so dev and dev:mock can run side by side.
    cacheDir: `node_modules/.vite-${mode}`,
    // Strict, because email links and the API's origin check expect this exact port.
    server: { port: mode === 'mock' ? 5174 : 5173, strictPort: true, proxy },
    preview: { port: 5173, strictPort: true, proxy },
  }
})

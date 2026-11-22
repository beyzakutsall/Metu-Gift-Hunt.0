import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { campusMap } from './campusMapPlugin'
import { mockCollection } from './mockCollectionPlugin'

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://127.0.0.1:4000'
  const proxy = { '/api': target }
  return {
    plugins: [react(), tailwindcss(), campusMap(), mockCollection(mode)],
    optimizeDeps: {
      // Imported lazily. Found late, they would make the dev server reload the page mid-discovery.
      include: [
        'three',
        'three/addons/controls/OrbitControls.js',
        'three/addons/environments/RoomEnvironment.js',
        'three/addons/libs/meshopt_decoder.module.js',
        'three/addons/loaders/GLTFLoader.js',
      ],
    },
    // Per mode, so dev and dev:mock can run side by side.
    // three.js is one lazy chunk, fetched only to look at a gift.
    build: { chunkSizeWarningLimit: 700 },
    cacheDir: `node_modules/.vite-${mode}`,
    // Strict, because email links and the API's origin check expect this exact port.
    server: { port: mode === 'mock' ? 5174 : 5173, strictPort: true, proxy },
    preview: { port: 5173, strictPort: true, proxy },
  }
})

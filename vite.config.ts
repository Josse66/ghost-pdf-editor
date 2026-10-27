import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** El concreto de la plaza: color de la barra de estado y de la pantalla de arranque. */
const CONCRETE = '#e4e3df'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA instalable que abre sin conexión. La app y el visor se guardan al primer uso; el motor de
    // exportación (wasm de PDFium, ~4.6 MB) y las fuentes se guardan la primera vez que se piden,
    // así la primera visita en el celular no baja megas que quizá nunca use.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ghost PDF Editor',
        short_name: 'Ghost',
        description:
          'Edita el texto de tus PDF directo en el navegador. Tu PDF nunca sale de tu dispositivo.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        theme_color: CONCRETE,
        background_color: CONCRETE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
        globIgnores: ['**/export.worker-*.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /\.(wasm|woff2?)$/.test(url.pathname) || url.pathname.includes('/export.worker-'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ghost-motor',
              expiration: { maxEntries: 500 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

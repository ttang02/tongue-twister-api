import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA }         from 'vite-plugin-pwa'
import path                from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name:             'Tongue Twister',
        short_name:       'Virelangues',
        description:      'Jeu de virelangues multilingue avec reconnaissance vocale',
        theme_color:      '#6366f1',
        background_color: '#0f172a',
        display:          'standalone',
        orientation:      'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/phrases/,
            handler: 'NetworkFirst',
            options: { cacheName: 'phrases-cache', expiration: { maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
})

import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import tailwindcss         from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA }         from 'vite-plugin-pwa'
import path                from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion':       ['motion/react'],
          'tanstack':     ['@tanstack/react-query', '@tanstack/react-router'],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
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
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
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

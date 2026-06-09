import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import tailwindcss         from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA }         from 'vite-plugin-pwa'
import basicSsl            from '@vitejs/plugin-basic-ssl'
import path                from 'path'

// Backend dev server — proxied so app stays same-origin HTTPS (mic needs secure context on LAN)
const API_TARGET = 'http://localhost:3000'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,            // bind 0.0.0.0 — reachable from phones on the same WiFi
    allowedHosts: true,    // accept Cloudflare quick-tunnel host (*.trycloudflare.com)
    proxy: {
      '/phrases': API_TARGET,
      '/scores':  API_TARGET,
      '/speech':  API_TARGET,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'motion':       ['motion/react'],
          'tanstack':     ['@tanstack/react-query', '@tanstack/react-router'],
          'i18n':         ['react-i18next', 'i18next'],
          'icons':        ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    basicSsl(),
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
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/phrases/,
            handler: 'NetworkFirst',
            options: { cacheName: 'phrases-cache', expiration: { maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
})

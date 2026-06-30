import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// bready — a phone-first PWA. The manifest below is what makes Safari's
// "Add to Home Screen" produce a real bready icon that launches full-screen.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'bready',
        short_name: 'bready',
        description: 'Beli for bakeries — log, rank, and translate your way through bread.',
        theme_color: '#7b2ff7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      // Commit gate: enforce 70% only where tests exist today; add more globs as
      // coverage grows. A commit that drops a tracked file below 70% is blocked.
      thresholds: {
        'src/lib/ranking.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
})

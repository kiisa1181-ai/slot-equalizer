import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: '乗り打ち精算',
        short_name: '乗り打ち精算',
        description: 'スロット乗り打ちのグループ収支を均等精算するアプリ',
        theme_color: '#0d0d12',
        background_color: '#0d0d12',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})

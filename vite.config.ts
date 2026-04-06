import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('recharts')) {
              return 'charts-vendor'
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'map-vendor'
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor'
            }
            return 'vendor' // Other node_modules
          }
        },
      },
    },
  },
})

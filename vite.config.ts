import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Chunk splitting óptimo
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Vendor: Firebase (el más pesado)
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Vendor: Charts & DnD
          'vendor-ui': ['recharts', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Vendor: utilidades ligeras
          'vendor-utils': ['date-fns', 'lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Target moderno para menor bundle
    target: 'es2020',
    // Minificación con esbuild (rápido y eficiente)
    minify: 'esbuild',
    // Threshold para inlining de assets
    assetsInlineLimit: 4096,
    // Source maps solo en dev
    sourcemap: false,
  },
})

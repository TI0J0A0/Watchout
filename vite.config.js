import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-i18n':  ['react-i18next', 'i18next'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})

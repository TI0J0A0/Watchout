import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 5173,
  },
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
  preview: {
    allowedHosts: ['funnyroll.com', 'www.funnyroll.com'],
  },
})

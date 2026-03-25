import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    // Use loopback by default (fewer firewall prompts). For phone/LAN: npm run dev -- --host
    host: 'localhost',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-flow': ['@xyflow/react'],
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-misc': ['zustand', 'dompurify'],
        },
      },
    },
  },
})

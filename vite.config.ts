import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // caminhos relativos
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
})

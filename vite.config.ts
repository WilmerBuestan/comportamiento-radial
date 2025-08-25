import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 👇 importante para GitHub Pages (ruta del repo)
  base: '/comportamiento-radial/',
})

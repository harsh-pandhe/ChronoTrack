import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built index.html loads its assets under file://
  // (packaged Electron) as well as over http (web portal).
  base: './',
  plugins: [react()],
})

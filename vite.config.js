import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Single source of truth for the displayed version: package.json (which also
// names the installers), so the desktop-agent header can never disagree with
// the actual build again.
const pkgVersion = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built index.html loads its assets under file://
  // (packaged Electron) as well as over http (web portal).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Everything used to land in one ~836KB chunk, so the landing page and the
    // login screen paid to download the entire admin console + charting library
    // before rendering. Split the two big vendors out: they're stable across
    // deploys (so they stay cached while app code churns), and recharts in
    // particular is only needed once you're actually looking at a dashboard.
    // NOTE: Vite 8 bundles with rolldown, which only accepts the *function*
    // form of manualChunks (the object form throws "manualChunks is not a
    // function" at build time).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
        },
      },
    },
  },
})

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, Vercel serves from /.
  // Set VITE_BASE at build time; defaults to root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel: leave VITE_BASE_PATH unset (defaults to /)
// GitHub Pages: set VITE_BASE_PATH=/your-repo-name/ in repository secrets
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
})

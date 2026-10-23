import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Relative paths so the build works both at promo.barugamedicalcenter.com/ and
  // garlan730.github.io/baruga-promo/ (which redirects to the custom domain).
  base: command === 'build' ? './' : '/',
}))

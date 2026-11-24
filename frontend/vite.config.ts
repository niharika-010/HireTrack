import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite configuration for the HireTrack frontend development and build setup.
// See https://vite.dev/config/ for full configuration options.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy /api requests to the local Loco.rs backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5150',
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.21.169.16',
        changeOrigin: true,
        timeout: 6000,
        proxyTimeout: 6000,
      },
    },
  },
});

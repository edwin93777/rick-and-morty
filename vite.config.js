import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js va en su propio chunk de carga diferida (portal 3D), que supera
    // el aviso por defecto de 500 kB.
    chunkSizeWarningLimit: 700,
  },
});

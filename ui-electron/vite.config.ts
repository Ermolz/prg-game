import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'renderer',
  base: './',
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'renderer/src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true, // listen on 0.0.0.0 so 127.0.0.1 and localhost both work (IPv4/IPv6)
  },
});

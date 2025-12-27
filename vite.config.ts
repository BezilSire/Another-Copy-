
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // tweetnacl and bip39 often require buffer at runtime
      buffer: 'buffer/'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'global': 'window'
  }
});

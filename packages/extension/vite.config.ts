import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { Plugin } from 'vite';

function privateNetworkAccessPlugin(): Plugin {
  return {
    name: 'private-network-access',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const origin = req.headers['origin'] ?? '-';
        process.stdout.write(`[REQ] ${req.method} ${req.url} origin=${origin}\n`);
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), privateNetworkAccessPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'panel.html'),
        overlay: resolve(__dirname, 'overlay.html'),
        config: resolve(__dirname, 'config.html'),
        mobile: resolve(__dirname, 'mobile.html'),
        'live-config': resolve(__dirname, 'live-config.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@creator-bio-hub/types': resolve(__dirname, '../../shared/types/src/index.ts'),
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
});

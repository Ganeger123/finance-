import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';
  return {
    server: {
      port: 5173,
      host: '127.0.0.1',
      middlewareMode: false,
      // HMR configuration for hot module replacement (WebSocket)
      hmr: isDev ? {
        host: '127.0.0.1',
        port: 5173,
        protocol: 'ws',
      } : undefined,
      // Proxy /api/* and /media/* to backend running on port 8000
      proxy: isDev
        ? {
          '^/api/': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            rewrite: (path) => path, // Keep /api prefix - backend routes registered with /api/auth, /api/admin, etc.
            secure: false,
            ws: true,
          },
          '^/media/': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            rewrite: (path) => path,
            secure: false,
          },
        }
        : undefined,
    },
    build: {
      // Disable source maps
      sourcemap: false,
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        middlewareMode: false,
        // HMR: avoid custom ws config that can cause 400; use defaults
        hmr: isDev,
        // Proxy only /api/* so backend gets /api/auth/login etc.
        proxy: isDev
          ? {
              '^/api/': {
                target: 'http://localhost:8000',
                changeOrigin: true,
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

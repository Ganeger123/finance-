import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        middlewareMode: false,
         // Proxy /api to backend in dev so there's no CORS (same-origin requests)
         proxy: isDev
           ? {
               '/api': {
                 target: 'http://localhost:8000',
                 changeOrigin: true,
                 // Don't proxy TypeScript files or static assets
                 bypass: (req, res, options) => {
                   // Don't proxy if it's a file request (has extension)
                   if (/\.[a-z]+(\?.*)?$/i.test(req.url)) {
                     return false;
                   }
                   // Don't proxy preflight OPTIONS requests for HMR
                   if (req.method === 'OPTIONS') {
                     return false;
                   }
                   // Proxy everything else that starts with /api
                   return null;
                 }
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

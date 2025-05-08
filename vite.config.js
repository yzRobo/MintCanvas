// vite.config.js
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy API requests to Vercel serverless functions during development
      '/api': {
        target: 'http://localhost:3000', // This is the default port for Vercel CLI
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  plugins: [
    vercel({
      // Enable preview features
      preview: {
        enabled: true,
      }
    }),
    react(),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
});
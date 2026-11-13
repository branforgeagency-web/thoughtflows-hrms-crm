import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The app used to ship as one ~6.6MB file, so every user downloaded all
    // nine dashboards (plus the Zoom SDK and the pptx parser) before anything
    // rendered. Dashboards are now React.lazy chunks; this splits the shared
    // vendor code out too so it caches across deploys instead of being
    // re-downloaded whenever any dashboard changes.
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@zoom')) return 'vendor-zoom';
          if (id.includes('pptxtojson') || id.includes('jszip')) return 'vendor-pptx';
          if (id.includes('aws-amplify') || id.includes('@aws-amplify') || id.includes('@smithy') || id.includes('@aws-sdk')) {
            return 'vendor-amplify';
          }
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('redux') || id.includes('react-redux')) return 'vendor-redux';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('axios')) return 'vendor-http';
          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/recordings': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      }
    }
  }
});

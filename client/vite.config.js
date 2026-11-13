import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Do NOT add a `rollupOptions.output.manualChunks` here.
    //
    // Splitting vendor code by matching on module paths (react / redux /
    // aws-amplify / ...) looks tidy but splits packages away from their own
    // transitive dependencies. That produces chunks that import each other in
    // a cycle, and the browser then fails at startup with
    //   "Uncaught ReferenceError: Cannot access 'k' before initialization"
    // because a const is read before its chunk has finished evaluating.
    //
    // Rollup's automatic chunking is cycle-aware and already does the right
    // thing here: the dashboards are React.lazy() dynamic imports, so each one
    // gets its own chunk for free, as do the Zoom SDK and the pptx parser.
    // First load is ~0.5MB instead of the old single 6.6MB bundle.
    //
    // The Zoom embedded SDK is ~3.2MB in its own chunk, but it is only fetched
    // when someone actually joins a meeting — this limit just stops the build
    // warning about a lazy chunk that is meant to be large.
    chunkSizeWarningLimit: 3500
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

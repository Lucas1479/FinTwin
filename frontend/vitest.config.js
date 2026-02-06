import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    testTimeout: 60000, // Increase timeout to 60 seconds for CI environment
    pool: 'threads', // Use threads instead of forks to fix ESM compatibility issues
    poolOptions: {
      threads: {
        singleThread: true, // Run tests in single thread to avoid jsdom conflicts
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});


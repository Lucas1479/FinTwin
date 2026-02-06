import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom', // Use happy-dom instead of jsdom for better ESM support
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    testTimeout: 60000, // Increase timeout to 60 seconds for CI environment
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});


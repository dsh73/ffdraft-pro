import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative paths so the built app works when loaded from a local file:// path inside Electron
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node', // the tested logic layer has no DOM dependency
    globals: false,
    include: ['src/**/*.test.ts'],
  },
});

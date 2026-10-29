import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  server: {
    fs: { allow: ['..'] },
  },
  // Mirrors the esbuild alias in utils/build.js so 'socle/core/...' resolves
  // identically under test. Keep the two in step.
  resolve: {
    alias: { socle: fileURLToPath(new URL('./_lib', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.js', '_lib/**/*.test.js'],
    environment: 'node',
    setupFiles: ['./_lib/core/test-setup.js'],
  },
});

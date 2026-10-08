import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the static build can be deployed to any sub-path.
  base: './',
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
  },
});

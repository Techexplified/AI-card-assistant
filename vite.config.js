import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        authorized: resolve(__dirname, 'authorized.html'),
        section: resolve(__dirname, 'section.html'),
        missingInfo: resolve(__dirname, 'missing-info.html'),
        readinessScore: resolve(__dirname, 'readiness-score.html'),
        improveCard: resolve(__dirname, 'improve-card.html'),
        checklistGenerator: resolve(__dirname, 'checklist-generator.html'),
        nextSteps: resolve(__dirname, 'next-steps.html'),
      },
    },
  },
});

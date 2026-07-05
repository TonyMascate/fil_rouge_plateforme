import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Module pur (aucune dépendance DOM/Node) → environnement node par défaut.
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // On ne mesure que la logique testable ; les schémas Zod déclaratifs et le
      // barrel sont exclus de la couverture (voir sonar-project.properties).
      include: ['src/color.ts'],
      exclude: ['**/*.spec.*', '**/node_modules/**'],
    },
  },
});
